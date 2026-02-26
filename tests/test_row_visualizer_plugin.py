from pathlib import Path

import pytest
from pydantic import BaseModel

from dataviewer.config import ViewArgs
from dataviewer.row_visualizer_plugin import RowVisualizerPlugin, load_plugin


class _TestSettings(BaseModel):
    label: str = "x"


class _InlinePlugin(RowVisualizerPlugin[_TestSettings]):
    def plugin_settings(self) -> _TestSettings:
        return _TestSettings()

    def get_row_html(self, row_data: dict, settings: _TestSettings, view_args: ViewArgs) -> str:  # noqa: ANN001
        return "<div>ok</div>"


def test_load_plugin_from_module_path() -> None:
    plugin = load_plugin(f"{__name__}._InlinePlugin")

    assert plugin.__class__.__name__ == "_InlinePlugin"
    assert isinstance(plugin, RowVisualizerPlugin)


def test_load_plugin_from_file_path(tmp_path: Path) -> None:
    plugin_file = tmp_path / "my_plugin.py"
    plugin_file.write_text(
        """\
from pydantic import BaseModel
from dataviewer.config import ViewArgs
from dataviewer.row_visualizer_plugin import RowVisualizerPlugin

class Settings(BaseModel):
    title: str = 'hello'

class FilePlugin(RowVisualizerPlugin[Settings]):
    def plugin_settings(self) -> Settings:
        return Settings()

    def get_row_html(self, row_data: dict, settings: Settings, view_args: ViewArgs) -> str:
        return '<div>file-plugin</div>'
""",
        encoding="utf-8",
    )

    plugin = load_plugin(f"{plugin_file}::FilePlugin")

    assert plugin.__class__.__name__ == "FilePlugin"


def test_load_plugin_invalid_format_raises() -> None:
    with pytest.raises(ValueError, match="Plugin must be in format"):
        load_plugin("InvalidFormat")


def test_load_plugin_missing_class_raises() -> None:
    with pytest.raises(ImportError, match="Class 'MissingPlugin' not found"):
        load_plugin(f"{__name__}.MissingPlugin")


def test_load_plugin_wrong_base_class_raises(tmp_path: Path) -> None:
    plugin_file = tmp_path / "bad_plugin.py"
    plugin_file.write_text(
        "class NotAPlugin:\n    pass\n",
        encoding="utf-8",
    )

    with pytest.raises(TypeError, match="must inherit RowVisualizerPlugin"):
        load_plugin(f"{plugin_file}::NotAPlugin")
