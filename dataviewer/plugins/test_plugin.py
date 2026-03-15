from fastapi import APIRouter
from pydantic import BaseModel

from dataviewer.row_visualizer_plugin import RowVisualizerPlugin, ViewArgs


class TestPluginSettings(BaseModel):
    greeting: str = "Hello world"


class TestPlugin(RowVisualizerPlugin[TestPluginSettings]):
    def plugin_settings(self) -> TestPluginSettings:
        return TestPluginSettings(greeting="hello world")

    def register_routes(self, router: APIRouter) -> None:
        print("registering plugins routes...")
        router.add_api_route(
            "/test_plugin_greeting",
            self.get_greeting,
            methods=["GET"],
            tags=["plugins"],
        )

    async def get_greeting(self, name: str | None) -> dict[str, str]:
        settings = self.plugin_settings()
        target = name or "Test User"
        return {"message": f"{settings.greeting}, {target}"}

    def get_row_html(
        self, row_data: dict, settings: TestPluginSettings, view_args: ViewArgs
    ) -> str:
        name = "Dataviewer User"

        return f"""
            <div>
                <div>{settings.greeting} - {view_args.dataset_path}</div>
                <div id=\"plugin-greeting\">Loading plugin greeting...</div>
                <script>
                    (async () => {{
                        const container = document.getElementById("plugin-greeting");
                        if (!container) return;

                        try {{
                            const name = "{name}";
                            const url =
                                `/api/plugins/test_plugin_greeting` +
                                `?name=${{encodeURIComponent(name)}}`;
                            const response = await fetch(url);
                            if (!response.ok) {{
                                container.textContent = `Request failed: ${{response.status}}`;
                                return;
                            }}

                            const data = await response.json();
                            container.textContent = data.message ?? "No message returned";
                        }} catch (error) {{
                            container.textContent = "Failed to load plugin greeting";
                        }}
                    }})();
                </script>
            </div>
        """
