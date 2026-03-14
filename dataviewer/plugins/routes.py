from fastapi import APIRouter
from pydantic import BaseModel

from dataviewer.config import get_config
from dataviewer.db import GLOBAL_TABLE, IbisDBDep
from dataviewer.response_types import Base64JSONResponse
from dataviewer.row_visualizer_plugin import RowVisualizerPlugin, load_plugin

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


row_visualizer_plugin: RowVisualizerPlugin[BaseModel] | None = None


class VisualizationRequest(BaseModel):
    id: str
    plugin_settings: dict | None = None


def load_row_visualizer_plugin() -> RowVisualizerPlugin[BaseModel] | None:
    global row_visualizer_plugin
    config = get_config()
    if not config.plugin_path:
        return None

    print(f"Loading plugin from {config.plugin_path}...")
    row_visualizer_plugin = load_plugin(config.plugin_path)
    print(f"Plugin '{row_visualizer_plugin.__class__.__name__}' loaded successfully")


@router.post("/get_row_visualization", response_class=Base64JSONResponse, response_model=None)
async def get_row_visualization(
    request: VisualizationRequest, ibis: IbisDBDep
) -> Base64JSONResponse:
    global row_visualizer_plugin

    config = get_config()
    if config.reload_plugin:
        if not config.plugin_path:
            return Base64JSONResponse(
                content={"error": "No visualization plugin configured"}, status_code=400
            )
        try:
            row_visualizer_plugin = load_plugin(config.plugin_path)
        except Exception as exc:
            return Base64JSONResponse(
                content={"error": f"Failed to reload plugin: {exc}"}, status_code=500
            )

    if row_visualizer_plugin is None:
        return Base64JSONResponse(
            content={"error": "No visualization plugin configured"}, status_code=400
        )

    if not config.id_column:
        return Base64JSONResponse(content={"error": "ID column not configured"}, status_code=400)

    # Update settings based on request parameters if provided,
    # otherwise use defaults from the plugin
    settings = row_visualizer_plugin.plugin_settings()
    if request.plugin_settings:
        try:
            settings = settings.model_copy(update=request.plugin_settings)
        except Exception as exc:
            return Base64JSONResponse(
                content={"error": f"Invalid plugin settings: {exc}"}, status_code=400
            )

    table = ibis.table(GLOBAL_TABLE)
    result = table.filter(table[config.id_column] == request.id).limit(1).execute()
    if result.empty:
        return Base64JSONResponse(content={"error": "Row not found"}, status_code=404)

    row_data = result.iloc[0].to_dict()

    html = row_visualizer_plugin.get_row_html(row_data, settings, config)
    return Base64JSONResponse(content={"html": html})


class Setting(BaseModel):
    name: str
    type: str
    value: str | int | float | bool | list[str | int | float | bool]


class SettingsResponse(BaseModel):
    plugin_name: str
    settings: list[Setting]


@router.get("/get_settings", response_model=SettingsResponse)
async def get_settings() -> SettingsResponse:
    if row_visualizer_plugin is None:
        return SettingsResponse(plugin_name="", settings=[])
    settings = row_visualizer_plugin.plugin_settings()
    return SettingsResponse(
        plugin_name=row_visualizer_plugin.__class__.__name__,
        settings=[
            Setting(name=k, type=v.__class__.__name__, value=v)
            for k, v in settings.model_dump().items()
        ],
    )
