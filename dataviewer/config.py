import os
from functools import lru_cache

from pydantic import BaseModel, model_validator

DEFAULT_CACHE_PATH = os.path.expanduser("~/.cache/dataviewer")


class ViewArgs(BaseModel):
    """Data Viewer arguments

    Attributes:
        dataset_path: Path to the dataset file (e.g., CSV, JSON, etc.)
        exclude_columns: List of columns to exclude from the storing in the dataset
        include_columns: List of columns to include in the dataset
        hidden_columns: List of columns to hide in the UI by default
        facet_columns: List of columns to generate pre-filter options (dropdowns) for
        id_column: Column to use as the unique identifier for each row
        image_columns: List of columns that contain image bytes
        embed_image_columns: List of columns that contain image URLs to embed in the UI
        embed_text_columns: List of columns that contain text to embed in the UI
        row_start: Starting row index to load from the dataset
        row_end: Ending row index to load from the dataset (exclusive)
        port: Port to run the UI on
        config: A file path to a JSON config file, configuring the above options
    """

    dataset_path: str | None = None

    # Column Seletion
    exclude_columns: list[str] | None = None
    include_columns: list[str] | None = None
    hidden_columns: list[str] | None = None
    facet_columns: list[str] | None = None

    # Special Columns
    id_column: str | None = None
    image_columns: list[str] | None = None
    embed_image_columns: list[str] | None = None
    embed_text_columns: list[str] | None = None

    # Filtering
    row_start: int | None = None
    row_end: int | None = None

    # Configuration
    port: int | None = None
    cache_path: str | None = None
    table_hash: str | None = None
    config: str | None = None

    @model_validator(mode="after")
    def _set_default_cache_path(self) -> "ViewArgs":
        if self.cache_path is None:
            self.cache_path = DEFAULT_CACHE_PATH
        return self


# Singleton config for the application
config: ViewArgs | None = None


def set_config(view_args: ViewArgs) -> None:
    global config
    config = view_args


@lru_cache(maxsize=1)
def get_config() -> ViewArgs:
    global config
    if config is None:
        raise ValueError("Config not set.")
    return config
