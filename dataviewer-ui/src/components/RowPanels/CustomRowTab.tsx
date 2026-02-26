import type { RowPanelParams } from "@/components/RowPanels/types";
import { useApp } from "@/contexts/AppContext";
import { DockviewDefaultTab, type IDockviewPanelHeaderProps } from "dockview";

export default function CustomRowTab(
  props: IDockviewPanelHeaderProps<RowPanelParams>,
) {
  const { pingResult } = useApp();
  const canReload = pingResult?.configuration.reload_plugin === true;

  const onReloadClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    props.params.onReload?.();
  };

  return (
    <div className="flex h-full w-full min-w-0 items-center gap-1 pr-1">
      <DockviewDefaultTab {...props} className="min-w-0 flex-1" />
      {canReload && (
        <button
          type="button"
          className="no-focus inline-flex h-5 w-5 items-center justify-center rounded"
          aria-label="Reload row visualization"
          title="Reload"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={onReloadClick}
        >
          <i className="pi pi-refresh text-xs" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
