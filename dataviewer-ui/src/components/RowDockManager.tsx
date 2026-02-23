import CustomRowPanel from "@/components/RowPanels/CustomRowPanel";
import DefaultRowPanel from "@/components/RowPanels/DefaultRowPanel";
import type {
  RowPanelParams,
  RowPanelType,
} from "@/components/RowPanels/types";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewIDisposable,
  type DockviewReadyEvent,
} from "dockview";
import { useCallback, useEffect, useRef } from "react";

export type {
  RowPanelParams,
  RowPanelType,
} from "@/components/RowPanels/types";

interface RowDockManagerProps {
  panels: RowPanelParams[];
  onPanelsChange: (panels: RowPanelParams[]) => void;
}

function toPanelType(value: unknown): RowPanelType {
  return value === "custom" ? "custom" : "default";
}

function panelsFromApi(api: DockviewApi): RowPanelParams[] {
  return api.panels.map((panel) => {
    const params = panel.params as Partial<RowPanelParams> | undefined;

    return {
      id: params?.id ?? panel.id,
      type: toPanelType(params?.type),
      panelId: panel.id,
    };
  });
}

const rowPanelComponents = {
  default: DefaultRowPanel,
  custom: CustomRowPanel,
};

function syncPanels(api: DockviewApi, panels: RowPanelParams[]) {
  const expectedIds = new Set(panels.map((panel) => panel.panelId));
  const existingById = new Map(api.panels.map((panel) => [panel.id, panel]));

  panels.forEach((panelData) => {
    const existingPanel = existingById.get(panelData.panelId);

    if (existingPanel) {
      const existingRowId =
        (existingPanel.params as Partial<RowPanelParams> | undefined)?.id ??
        existingPanel.id;
      const existingType = toPanelType(
        (existingPanel.params as Partial<RowPanelParams> | undefined)?.type,
      );

      if (existingType !== panelData.type || existingRowId !== panelData.id) {
        api.removePanel(existingPanel);
      } else {
        return;
      }
    }

    api.addPanel({
      id: panelData.panelId,
      title: panelData.id,
      component: panelData.type,
      params: panelData,
      inactive: api.panels.length > 0,
    });
  });

  [...api.panels].forEach((panel) => {
    if (!expectedIds.has(panel.id)) {
      api.removePanel(panel);
    }
  });
}

export default function RowDockManager({
  panels,
  onPanelsChange,
}: RowDockManagerProps) {
  const dockviewApiRef = useRef<DockviewApi | null>(null);
  const removePanelSubscriptionRef = useRef<DockviewIDisposable | null>(null);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      dockviewApiRef.current = event.api;

      removePanelSubscriptionRef.current?.dispose();
      removePanelSubscriptionRef.current = event.api.onDidRemovePanel(() => {
        onPanelsChange(panelsFromApi(event.api));
      });

      syncPanels(event.api, panels);
    },
    [onPanelsChange, panels],
  );

  useEffect(() => {
    const api = dockviewApiRef.current;

    if (!api) {
      return;
    }

    syncPanels(api, panels);
  }, [panels]);

  useEffect(
    () => () => {
      removePanelSubscriptionRef.current?.dispose();
      removePanelSubscriptionRef.current = null;
      dockviewApiRef.current = null;
    },
    [],
  );

  if (panels.length === 0) {
    return (
      <div className="h-full w-full min-h-0 min-w-0 grid place-items-center text-center px-4 text-lg text-gray-400">
        No current row selected. Right-click on a row and select "Open Row
        Viewer" to get started.
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-0 min-w-0">
      <DockviewReact
        className="h-full w-full min-h-0 min-w-0"
        components={rowPanelComponents}
        onReady={onReady}
      />
    </div>
  );
}
