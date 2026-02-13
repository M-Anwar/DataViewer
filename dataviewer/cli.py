import click
import uvicorn
from pydanclick import from_pydantic
from rich import print

from dataviewer.app import app as fastapi_app
from dataviewer.config import ViewArgs, set_config


@click.group()
def main():
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
def generate_config(output: str):
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
        row_start=0,
        row_end=100,
        port=8000,
    )
    print("Generating example config")
    with open(output, "w") as f:
        f.write(example_config.model_dump_json(indent=4, exclude={"config"}))


@main.command("view")
@from_pydantic(ViewArgs)
def view(view_args: ViewArgs):
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
    if not view_args.dataset_path:
        raise click.BadParameter(
            "dataset_path is required", param_hint="--dataset-path"
        )

    host = "127.0.0.1"
    port = view_args.port or 8000
    set_config(view_args)
    print(f"Starting FastAPI app on {host}:{port} for {view_args.dataset_path}")
    print(view_args)

    uvicorn.run(fastapi_app, host=host, port=port)


if __name__ == "__main__":
    main()
