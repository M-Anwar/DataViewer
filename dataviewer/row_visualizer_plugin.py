import importlib
import importlib.util
import sys
from abc import ABC, abstractmethod

from pydantic import BaseModel

from dataviewer.config import ViewArgs


class RowVisualizerPlugin[T: BaseModel](ABC):
    @abstractmethod
    def plugin_settings(self) -> T:
        """
        Return a Pydantic model instance containing the settings for this plugin.
        This will be used to generate a UI for configuring the plugin.
        """
        pass

    @abstractmethod
    def get_row_html(self, row_data: dict, settings: T, view_args: ViewArgs) -> str:
        """
        Given a dictionary of row data, return an HTML string to visualize that row.
        """
        pass


def load_plugin(path_or_module: str) -> RowVisualizerPlugin[BaseModel]:
    """
    Load a RowVisualizerPlugin from a given module path or module name.

    The path_or_module can be in the format:
    - "my_module.MyPluginClass"
    - "my_package.my_module.MyPluginClass"
    - "/path/to/my_plugin.py::MyPluginClass"

    The plugin class must inherit from RowVisualizerPlugin.
    """
    if "::" in path_or_module:
        module_path, class_name = path_or_module.split("::", 1)
        spec = importlib.util.spec_from_file_location("plugin_module", module_path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not load module from path: {module_path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    else:
        try:
            module_path, class_name = path_or_module.rsplit(".", 1)
        except ValueError as exc:
            raise ValueError("Plugin must be in format 'package.module.ClassName'") from exc
        importlib.invalidate_caches()
        if module_path in sys.modules:
            module = importlib.reload(sys.modules[module_path])
        else:
            module = importlib.import_module(module_path)

    plugin_class = getattr(module, class_name, None)
    if plugin_class is None:
        raise ImportError(f"Class '{class_name}' not found in module '{module.__name__}'")

    if not isinstance(plugin_class, type):
        raise TypeError(f"'{class_name}' in module '{module.__name__}' is not a class")

    if not issubclass(plugin_class, RowVisualizerPlugin):
        raise TypeError(
            f"Class '{class_name}' in module '{module.__name__}' must inherit RowVisualizerPlugin"
        )

    return plugin_class()
