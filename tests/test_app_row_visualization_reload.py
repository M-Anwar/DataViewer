import asyncio
import json
from types import SimpleNamespace
from unittest.mock import MagicMock

import ibis
import pandas as pd
from pydantic import BaseModel

import dataviewer.app as app_module
from dataviewer.config import ViewArgs
from dataviewer.row_visualizer_plugin import RowVisualizerPlugin


class _Settings(BaseModel):
    title: str = "ok"


class _ReloadedPlugin(RowVisualizerPlugin[_Settings]):
    def plugin_settings(self) -> _Settings:
        return _Settings()

    def get_row_html(self, row_data: dict, settings: _Settings, view_args: ViewArgs) -> str:  # noqa: ANN001
        return f"<div>{row_data['id']}</div>"


def test_get_row_visualization_reload_plugin(monkeypatch) -> None:  # type: ignore[no-untyped-def]  # noqa: ANN001
    reloaded_plugin = _ReloadedPlugin()

    monkeypatch.setattr(
        app_module,
        "get_config",
        lambda: SimpleNamespace(
            id_column="id",
            plugin_path="test.module.Plugin",
            reload_plugin=True,
        ),
    )

    load_plugin_mock = MagicMock(return_value=reloaded_plugin)
    monkeypatch.setattr(app_module, "load_plugin", load_plugin_mock)
    app_module.row_visualizer_plugin = None

    ibis_backend = ibis.duckdb.connect(database=":memory:")
    ibis_backend.create_table(
        app_module.GLOBAL_TABLE,
        pd.DataFrame([{"id": "row-1"}]),
        overwrite=True,
    )

    response = asyncio.run(
        app_module.get_row_visualization(
            app_module.VisualizationRequest(id="row-1"),
            ibis_backend,
        )
    )

    body = json.loads(response.body.decode("utf-8"))  # type: ignore

    assert response.status_code == 200
    assert body["html"] == "<div>row-1</div>"
    load_plugin_mock.assert_called_once_with("test.module.Plugin")
    assert app_module.row_visualizer_plugin is reloaded_plugin
