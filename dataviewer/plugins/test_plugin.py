from pydantic import BaseModel

from dataviewer.row_visualizer_plugin import RowVisualizerPlugin, ViewArgs


class TestPluginSettings(BaseModel):
    greeting: str = "Hello world"


class TestPlugin(RowVisualizerPlugin[TestPluginSettings]):
    def plugin_settings(self) -> TestPluginSettings:
        return TestPluginSettings(greeting="hello world")

    def get_row_html(
        self, row_data: dict, settings: TestPluginSettings, view_args: ViewArgs
    ) -> str:
        return f"<div>{settings.greeting} - {view_args.dataset_path} </div>"
