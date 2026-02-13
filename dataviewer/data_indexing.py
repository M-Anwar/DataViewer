import hashlib
from collections.abc import Iterator
from datetime import timedelta
from enum import Enum
from pathlib import PurePosixPath
from urllib.parse import urlparse

import lance
import lancedb
import polars as pl
from tqdm import tqdm

from dataviewer.config import ViewArgs


class DatasetFormat(Enum):
    CSV = "csv"
    JSONL = "jsonl"
    PARQUET = "parquet"
    LANCE = "lance"


def _dataset_name(dataset_path: str) -> str:
    parsed = urlparse(dataset_path)
    raw_path = parsed.path if parsed.scheme else dataset_path
    path = PurePosixPath(raw_path)
    if any(ch in path.name for ch in ("*", "?", "[", "]")):
        path = path.parent
    return path.stem if path.suffix else path.name


def _infer_format(dataset_path: str) -> DatasetFormat:
    """Infer the dataset format from the file extension or URL scheme.
    Supports CSV, JSON, JSONL, Parquet, and Lance formats.
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


def stream_dataset(
    dataset_path: str, dataset_format: DatasetFormat, batch_size: int
) -> Iterator[pl.DataFrame]:
    """Stream the dataset in batches as Polars DataFrames."""
    if dataset_format == DatasetFormat.PARQUET:
        df = pl.scan_parquet(dataset_path)
    elif dataset_format == DatasetFormat.CSV:
        df = pl.scan_csv(dataset_path)
    elif dataset_format == DatasetFormat.JSONL:
        df = pl.scan_ndjson(dataset_path)
    else:
        raise ValueError(f"Unsupported dataset format for streaming: {dataset_format}")

    total = df.select(pl.count()).collect().item()
    with tqdm(total=total, desc="Streaming dataset") as pbar:
        for batch in df.collect_batches(chunk_size=batch_size):
            pbar.update(len(batch))
            yield batch


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

    dataset_name = _dataset_name(view_args.dataset_path)
    dataset_format = _infer_format(view_args.dataset_path)
    dataset_hash = hashlib.md5(f"{dataset_name}_{dataset_format.value}".encode()).hexdigest()

    db = lancedb.connect(view_args.cache_path)

    if not reindex and dataset_hash in db.list_tables().tables:
        print("Lance index already exists in cache, skipping indexing")
        return dataset_hash

    if dataset_format != DatasetFormat.LANCE:
        data_stream = stream_dataset(view_args.dataset_path, dataset_format, batch_size=batch_size)
        tbl = db.create_table(dataset_hash, data=data_stream, mode="overwrite")
        tbl.optimize(cleanup_older_than=timedelta(seconds=0), delete_unverified=True)
    else:
        # For Lance datasets, we can directly copy the dataset into the cache without streaming
        dataset = lance.dataset(view_args.dataset_path)
        tbl = db.create_table(dataset_hash, data=dataset, mode="overwrite")
        tbl.optimize(cleanup_older_than=timedelta(seconds=0), delete_unverified=True)

    return dataset_hash
