import pytest

from dataviewer.data_indexing import DatasetFormat, _dataset_name, _infer_format


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
    assert _dataset_name(dataset_path) == expected


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
    assert _infer_format(dataset_path) == expected


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
        _infer_format(dataset_path)
