import pytest

from dataviewer.data_indexing import (
    DatasetFormat,
    _get_columns,
    get_dataset_name,
    infer_format,
)


@pytest.mark.parametrize(
    "dataset_path,expected",
    [
        ("data.csv", "data"),
        ("data", "data"),
        ("/path/to/data.csv", "data"),
        ("/path/to/data", "data"),
        ("s3://bucket/path/data.csv", "data"),
        ("/path/to/*.parquet", "to"),
        ("/path/to/file?.parquet", "to"),
        ("/path/to/file[0-9].parquet", "to"),
    ],
)
def test_dataset_name(dataset_path: str, expected: str) -> None:
    assert get_dataset_name(dataset_path) == expected


@pytest.mark.parametrize(
    "dataset_path,expected",
    [
        ("data.csv", DatasetFormat.CSV),
        ("data.tsv", DatasetFormat.CSV),
        ("/path/to/data.json", DatasetFormat.JSONL),
        ("/path/to/data.jsonl", DatasetFormat.JSONL),
        ("/path/to/data.parquet", DatasetFormat.PARQUET),
        ("/path/to/data.lance", DatasetFormat.LANCE),
        ("s3://bucket/path/data.csv", DatasetFormat.CSV),
        ("s3://bucket/path/data.parquet", DatasetFormat.PARQUET),
        ("s3://data-set/data/*.parquet", DatasetFormat.PARQUET),
    ],
)
def test_infer_format_supported(dataset_path: str, expected: DatasetFormat) -> None:
    assert infer_format(dataset_path) == expected


@pytest.mark.parametrize(
    "dataset_path",
    [
        "data",
        "/path/to/data.unknown",
        "s3://bucket/path/data",
    ],
)
def test_infer_format_unsupported(dataset_path: str) -> None:
    with pytest.raises(ValueError, match="Unsupported dataset format"):
        infer_format(dataset_path)


def test_get_columns_no_filters_returns_all() -> None:
    all_columns = ["id", "name", "age"]

    result = _get_columns(all_columns, include_cols=None, exclude_cols=None)

    assert set(result) == set(all_columns)


def test_get_columns_include_only_limits_columns() -> None:
    all_columns = ["id", "name", "age"]
    include_cols = ["name", "age"]

    result = _get_columns(all_columns, include_cols=include_cols, exclude_cols=None)

    assert set(result) == set(include_cols)


def test_get_columns_exclude_only_removes_columns() -> None:
    all_columns = ["id", "name", "age"]
    exclude_cols = ["age"]

    result = _get_columns(all_columns, include_cols=None, exclude_cols=exclude_cols)

    assert set(result) == {"id", "name"}


def test_get_columns_include_then_exclude() -> None:
    all_columns = ["id", "name", "age", "city"]
    include_cols = ["id", "name", "age"]
    exclude_cols = ["age"]

    result = _get_columns(all_columns, include_cols=include_cols, exclude_cols=exclude_cols)

    assert set(result) == {"id", "name"}


def test_get_columns_invalid_include_raises() -> None:
    all_columns = ["id", "name", "age"]
    include_cols = ["name", "missing"]

    with pytest.raises(ValueError, match="Included columns not found in dataset"):
        _get_columns(all_columns, include_cols=include_cols, exclude_cols=None)


def test_get_columns_invalid_exclude_raises() -> None:
    all_columns = ["id", "name", "age"]
    exclude_cols = ["missing"]

    with pytest.raises(ValueError, match="Excluded columns not found in dataset"):
        _get_columns(all_columns, include_cols=None, exclude_cols=exclude_cols)
