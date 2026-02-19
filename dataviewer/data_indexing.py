import hashlib
from collections.abc import Iterator
from datetime import timedelta
from enum import Enum
from pathlib import PurePosixPath
from urllib.parse import urlparse

import lance
import lancedb
import polars as pl
import pyarrow as pa
from tqdm import tqdm

from dataviewer.config import ViewArgs


class DatasetFormat(Enum):
    CSV = "csv"
    JSONL = "jsonl"
    PARQUET = "parquet"
    LANCE = "lance"


def get_dataset_name(dataset_path: str) -> str:
    """
    Extract the dataset name from the given dataset path by removing
    the directory and file extension.

    :param dataset_path: The file path for the dataset
    :return: The name of the dataset
    """
    parsed = urlparse(dataset_path)
    raw_path = parsed.path if parsed.scheme else dataset_path
    path = PurePosixPath(raw_path)
    if any(ch in path.name for ch in ("*", "?", "[", "]")):
        path = path.parent
    return path.stem if path.suffix else path.name


def infer_format(dataset_path: str) -> DatasetFormat:
    """
    Infer the dataset format from the file extension or URL scheme.
    Supports CSV, JSON, JSONL, Parquet, and Lance formats.

    :param dataset_path: The file path for the dataset
    :return: The supported dataset format
    """

    parsed = urlparse(dataset_path)
    raw_path = parsed.path if parsed.scheme else dataset_path
    path = PurePosixPath(raw_path)

    if path.suffix in (".csv", ".tsv"):
        return DatasetFormat.CSV
    elif path.suffix in (".json", ".jsonl"):
        return DatasetFormat.JSONL
    elif path.suffix in (".parquet",):
        return DatasetFormat.PARQUET
    elif path.suffix in (".lance",):
        return DatasetFormat.LANCE
    else:
        raise ValueError(f"Unsupported dataset format for path: {dataset_path}")


def _get_columns(
    all_column: list[str], include_cols: list[str] | None, exclude_cols: list[str] | None
) -> list[str]:
    """
    Determine the final list of columns to include based on the provided
    include and exclude column lists.

    :param all_column: The complete list of columns available in the dataset
    :param include_cols: The list of columns to include (if specified)
    :param exclude_cols: The list of columns to exclude (if specified)
    :return: The final list of columns to use for the view
    """
    all_column_set = set(all_column)
    if include_cols is not None:
        invalid_include = set(include_cols) - all_column_set
        if invalid_include:
            raise ValueError(f"Included columns not found in dataset: {invalid_include}")
        all_column_set = set(include_cols)

    if exclude_cols is not None:
        invalid_exclude = set(exclude_cols) - all_column_set
        if invalid_exclude:
            raise ValueError(f"Excluded columns not found in dataset: {invalid_exclude}")
        all_column_set -= set(exclude_cols)

    return list(all_column_set)


def _stream_dataset(
    dataset_path: str,
    dataset_format: DatasetFormat,
    batch_size: int,
    include_cols: list[str] | None = None,
    exclude_cols: list[str] | None = None,
    limit: int | None = None,
    row_start: int | None = None,
    row_end: int | None = None,
) -> Iterator[pl.DataFrame]:
    """
    Stream the dataset in batches as Polars DataFrames.

    :param dataset_path: The file path for the dataset
    :param dataset_format: The format of the dataset (e.g., CSV, JSONL, Parquet)
    :param batch_size: The number of rows per batch when streaming the dataset
    :param include_cols: The list of columns to include (if specified)
    :param exclude_cols: The list of columns to exclude (if specified)
    :param limit: The maximum number of rows to return (if specified)
    :return: An iterator over Polars DataFrames representing the dataset in batches
    """
    if dataset_format == DatasetFormat.PARQUET:
        df = pl.scan_parquet(dataset_path)
    elif dataset_format == DatasetFormat.CSV:
        df = pl.scan_csv(dataset_path)
    elif dataset_format == DatasetFormat.JSONL:
        df = pl.scan_ndjson(dataset_path)
    else:
        raise ValueError(f"Unsupported dataset format for streaming: {dataset_format}")

    all_columns = df.collect_schema().names()
    final_columns = _get_columns(all_columns, include_cols=include_cols, exclude_cols=exclude_cols)
    df = df.select(final_columns)

    # Either limit or row_start and row_end can be specified, otherwise error
    if limit is not None and (row_start is not None or row_end is not None):
        raise ValueError("Cannot specify both limit and row_start/row_end")

    if row_start is not None and row_end is not None:
        df = df.slice(offset=row_start, length=row_end - row_start)
    if limit is not None:
        df = df.limit(limit)

    total = df.select(pl.count()).collect().item()
    with tqdm(total=total, desc="Streaming dataset") as pbar:
        for batch in df.collect_batches(chunk_size=batch_size):
            arrow_batch = batch.to_arrow()
            schema = arrow_batch.schema
            new_fields = []
            for field in schema:
                if pa.types.is_large_list(field.type):
                    new_fields.append(pa.field(field.name, pa.list_(field.type.value_type)))
                elif pa.types.is_large_binary(field.type):
                    new_fields.append(pa.field(field.name, pa.binary()))
                elif pa.types.is_large_string(field.type):
                    new_fields.append(pa.field(field.name, pa.string()))
                else:
                    new_fields.append(field)

            pbar.update(len(batch))
            new_schema = pa.schema(new_fields)
            new_batch = arrow_batch.cast(new_schema)
            yield new_batch


def get_data_schema(dataset_path: str) -> pa.Schema:
    """
    Get the schema of a dataset using scanning based on the dataset format.

    :param dataset_path: The dataset path to infer the format and read the schema from
    :return: The schema of the dataset
    """

    dataset_format = infer_format(dataset_path)

    if dataset_format == DatasetFormat.PARQUET:
        return pl.scan_parquet(dataset_path).collect_schema().to_arrow()
    elif dataset_format == DatasetFormat.CSV:
        return pl.scan_csv(dataset_path).collect_schema().to_arrow()
    elif dataset_format == DatasetFormat.JSONL:
        return pl.scan_ndjson(dataset_path).collect_schema().to_arrow()
    elif dataset_format == DatasetFormat.LANCE:
        return lance.dataset(dataset_path).schema
    else:
        raise ValueError(f"Unsupported dataset format for schema inference: {dataset_format}")


def build_lance_index(view_args: ViewArgs, reindex: bool, batch_size: int) -> str:
    """
    Build a Lance index from the dataset specified in the view arguments.

    This function identifies the name of the dataset from the provided path.
    If the dataset hash already exists as a lancedb table in the cache, we
    skip indexing, otherwise we create a new lancedb table with this
    hash and index the dataset into it.

    :param view_args: The view arguments containing the dataset path and cache path
    :param reindex: Whether to force reindexing of the dataset even if cache exists
    :param batch_size: Batch size for streaming dataset during indexing

    :return: The hash of the dataset used as the table name in the cache
    """
    if not view_args.dataset_path:
        raise ValueError("dataset_path is required to build the Lance index")
    assert view_args.cache_path is not None, "cache_path must be set in view_args"

    dataset_name = get_dataset_name(view_args.dataset_path)
    dataset_format = infer_format(view_args.dataset_path)
    dataset_hash = hashlib.md5(f"{dataset_name}_{dataset_format.value}".encode()).hexdigest()

    db = lancedb.connect(view_args.cache_path)

    if not reindex and dataset_hash in db.list_tables().tables:
        print("Lance index already exists in cache, skipping indexing")
        return dataset_hash

    if dataset_format != DatasetFormat.LANCE:
        data_stream = _stream_dataset(
            view_args.dataset_path,
            dataset_format,
            batch_size=batch_size,
            include_cols=view_args.include_columns,
            exclude_cols=view_args.exclude_columns,
            limit=view_args.limit,
            row_start=view_args.row_start,
            row_end=view_args.row_end,
        )
        tbl = db.create_table(dataset_hash, data=data_stream, mode="overwrite")
    else:
        # For Lance datasets, we can directly copy the dataset into the cache without streaming
        # TODO: Many selection & filtering options are currently not implemented for a Lance dataset
        dataset = lance.dataset(view_args.dataset_path)
        tbl = db.create_table(dataset_hash, data=dataset, mode="overwrite")

    if view_args.id_column:
        tbl.create_scalar_index(view_args.id_column)

    tbl.optimize(cleanup_older_than=timedelta(seconds=0), delete_unverified=True)

    return dataset_hash
