import type { RowPanelOpenParams } from "@/components/RowPanels/types";
import { type Filter, type Sort } from "@/services/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataViewer from "./components/DataViewer/DataViewer";
import { Header } from "./components/Header";
import RowDockManager, {
  type RowPanelParams,
} from "./components/RowDockManager";
import SplitHolder from "./components/SplitHolder";
import { AppProvider } from "./contexts/AppContext";
import { PluginProvider } from "./contexts/PluginContext";

type DockMode = "hidden" | "horizontal" | "vertical";

function App() {
  const [dockMode, setDockMode] = useState<DockMode>("hidden");
  const [rowPanels, setRowPanels] = useState<RowPanelParams[]>([]);

  const [filters, setFilters] = useState<Filter[]>([]);
  const [sorts, setSorts] = useState<Sort[]>([]);
  const [sqlQuery, setSQLQuery] = useState<string>(
    "SELECT * FROM dataset LIMIT 10 OFFSET 0;",
  );
  const [searchMode, setSearchMode] = useState<"Quick Filters" | "SQL Editor">(
    "Quick Filters",
  );
  const dataViewerSearchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (rowPanels.length === 0) {
      setDockMode("hidden");
    }
  }, [rowPanels]);

  const handleRegisterSearch = useCallback((searchFn: () => void) => {
    dataViewerSearchRef.current = searchFn;
  }, []);

  const handleOpenRowPanel = useCallback((panel: RowPanelOpenParams) => {
    setDockMode((currentMode) =>
      currentMode === "hidden" ? "horizontal" : currentMode,
    );

    setRowPanels((previousPanels) => {
      const nextSequence = previousPanels.length + 1;

      return [
        ...previousPanels,
        {
          id: panel.id,
          type: panel.type,
          panelId: `row-panel-${nextSequence}-${panel.id}-${panel.type}`,
        },
      ];
    });
  }, []);

  // Filters
  const onAddFilter = (filter: Filter) => {
    setFilters((prev) => [...prev, filter]);
  };

  const onRemoveFilter = (idx: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== idx));
  };

  const onUpdateFilter = (idx: number, updatedFilter: Filter) => {
    setFilters((prev) =>
      prev.map((filter, i) => (i === idx ? updatedFilter : filter)),
    );
  };

  const onClearFilters = () => {
    setFilters([]);
  };

  // Sorts
  const onAddSort = (sort: Sort) => {
    setSorts((prev) => [...prev, sort]);
  };

  const onRemoveSort = (idx: number) => {
    setSorts((prev) => prev.filter((_, i) => i !== idx));
  };

  const onClearSorts = () => {
    setSorts([]);
  };

  const splitVisible = dockMode !== "hidden";
  const splitDirection: "vertical" | "horizontal" =
    dockMode === "vertical" ? "vertical" : "horizontal";

  const onToggleSplitMode = () => {
    setDockMode((currentMode) => {
      if (currentMode === "hidden") {
        return "horizontal";
      }

      if (currentMode === "horizontal") {
        return "vertical";
      }

      return "hidden";
    });
  };

  const mainView = useMemo(
    () => (
      <div className="h-full w-full min-h-0 min-w-0 flex flex-col overflow-hidden">
        <DataViewer
          filters={filters}
          sorts={sorts}
          sqlQuery={sqlQuery}
          searchMode={searchMode}
          onRegisterSearch={handleRegisterSearch}
          onOpenRowPanel={handleOpenRowPanel}
        />
      </div>
    ),
    [
      filters,
      sorts,
      handleOpenRowPanel,
      handleRegisterSearch,
      searchMode,
      sqlQuery,
    ],
  );

  return (
    <AppProvider>
      <PluginProvider>
        <div className="fixed inset-0 flex min-h-0 min-w-0 flex-col">
          <Header
            filters={filters}
            sorts={sorts}
            sqlQuery={sqlQuery}
            searchMode={searchMode}
            setSearchMode={setSearchMode}
            onFiltersChange={setFilters}
            onAddFilter={onAddFilter}
            onUpdateFilter={onUpdateFilter}
            onRemoveFilter={onRemoveFilter}
            onClearFilters={onClearFilters}
            onSQLQueryChange={setSQLQuery}
            onAddSort={onAddSort}
            onRemoveSort={onRemoveSort}
            onClearSorts={onClearSorts}
            onSearch={() => dataViewerSearchRef.current?.()}
            dockMode={dockMode}
            onToggleSplitMode={onToggleSplitMode}
          />
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
            <SplitHolder
              splitDirection={splitDirection}
              splitVisible={splitVisible}
              mainView={mainView}
              auxiliaryView={
                <RowDockManager
                  panels={rowPanels}
                  onPanelsChange={setRowPanels}
                />
              }
            />
          </div>
        </div>
      </PluginProvider>
    </AppProvider>
  );
}

export default App;
