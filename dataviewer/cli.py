import os
import shutil

import click
import uvicorn
from pydanclick import from_pydantic
from rich import print

from dataviewer.app import app as fastapi_app
from dataviewer.config import DEFAULT_CACHE_PATH, ViewArgs, set_config
from dataviewer.data_indexing import build_lance_index, get_data_schema


@click.group()
def main() -> None:
    """
    Dataviewer - A DuckDB + Lance Powered Data Viewer for Multi-Modal Datasets
    """

    pass


@main.command("generate-config")
@click.argument(
    "output",
    type=click.Path(),
    default="example_config.json",
)
def generate_config(output: str) -> None:
    """
    Generates an example config file for the Data Viewer application.
    Defaults to "example_config.json" in the current directory.
    """

    example_config = ViewArgs(
        dataset_path="data.csv",
        exclude_columns=["column1", "column2"],
        include_columns=["column3", "column4"],
        hidden_columns=["column5"],
        facet_columns=["column6"],
        id_column="id",
        image_columns=["image_bytes"],
        embed_image_columns=["image_url"],
        embed_text_columns=["description"],
        row_start=0,
        row_end=100,
        limit=100,
        plugin_path="plugins/custom_plugin.py",
        port=8000,
        cache_path="~/.cache/dataviewer",
        reload_plugin=False,
    )
    print("Generating example config to:", output)
    with open(output, "w") as f:
        f.write(example_config.model_dump_json(indent=4, exclude={"config"}))


@main.command("clear-cache")
@click.confirmation_option(prompt="Are you sure you want to clear the cache?")
@click.option("--cache-path", default=DEFAULT_CACHE_PATH, help="Path to the cache directory")
def clear_cache(cache_path: str) -> None:
    """
    Clears the cached Lance indices for all datasets.
    This will remove all cached indices from the cache directory.
    """
    cache_path = os.path.expanduser(cache_path)
    if os.path.exists(cache_path):
        shutil.rmtree(cache_path)
        print(f"Cleared cache at {cache_path}")
    else:
        print(f"No cache found at {cache_path}")


@main.command("get-schema")
@click.argument("dataset_path", type=click.Path())
def get_schema(dataset_path: str) -> None:
    """
    Get the schema of a dataset.
    """
    schema = get_data_schema(dataset_path)
    print(schema)


@main.command("view")
@from_pydantic(ViewArgs)
@click.option("--reindex", is_flag=True, help="Whether to force reindexing of the dataset")
@click.option(
    "--batch-size", default=10_000, help="Batch size for streaming dataset during indexing"
)
def view(view_args: ViewArgs, reindex: bool, batch_size: int) -> None:
    """
    Start the DataViewer UI web application
    """
    print(r"""
    ______      _        _   _ _
    |  _  \    | |      | | | (_)
    | | | |__ _| |_ __ _| | | |_  _____      _____ _ __
    | | | / _` | __/ _` | | | | |/ _ \ \ /\ / / _ \ '__|
    | |/ / (_| | || (_| \ \_/ / |  __/\ V  V /  __/ |
    |___/ \__,_|\__\__,_|\___/|_|\___| \_/\_/ \___|_|
                        DataViewer
    """)
    if view_args.config:
        print(f"Loading config from {view_args.config}")
        with open(view_args.config) as f:
            config_json = f.read()
        view_args = ViewArgs.model_validate_json(config_json)

    if not view_args.dataset_path:
        raise click.BadParameter("dataset_path is required", param_hint="--dataset-path")

    # Generate Data index
    cache_path = view_args.cache_path or DEFAULT_CACHE_PATH
    os.makedirs(cache_path, exist_ok=True)
    print("Building local cache...")
    table_hash = build_lance_index(view_args, reindex=reindex, batch_size=batch_size)

    host = "127.0.0.1"
    port = view_args.port or 8000
    view_args.table_hash = table_hash
    set_config(view_args)

    print(f"Starting UI on {host}:{port} for {view_args.dataset_path}")
    print(view_args)

    uvicorn.run(fastapi_app, host=host, port=port)


if __name__ == "__main__":
    main()
