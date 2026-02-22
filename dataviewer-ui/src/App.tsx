import { type Filter } from "@/services/api";
import { useRef, useState } from "react";
import DataViewer from "./components/DataViewer/DataViewer";
import { Header } from "./components/Header";
import SplitHolder from "./components/SplitHolder";
import { AppProvider } from "./contexts/AppContext";

type DockMode = "hidden" | "horizontal" | "vertical";

function App() {
  const [dockMode, setDockMode] = useState<DockMode>("hidden");

  const [filters, setFilters] = useState<Filter[]>([]);
  const [sqlQuery, setSQLQuery] = useState<string>(
    "SELECT * FROM dataset LIMIT 10 OFFSET 0;",
  );
  const [searchMode, setSearchMode] = useState<"Quick Filters" | "SQL Editor">(
    "Quick Filters",
  );
  const dataViewerSearchRef = useRef<(() => void) | null>(null);

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

  return (
    <AppProvider>
      <div className="fixed inset-0 flex min-h-0 min-w-0 flex-col">
        <Header
          filters={filters}
          sqlQuery={sqlQuery}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          onAddFilter={onAddFilter}
          onUpdateFilter={onUpdateFilter}
          onRemoveFilter={onRemoveFilter}
          onSQLQueryChange={setSQLQuery}
          onSearch={() => dataViewerSearchRef.current?.()}
          dockMode={dockMode}
          onToggleSplitMode={onToggleSplitMode}
        />
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
          <SplitHolder
            splitDirection={splitDirection}
            splitVisible={splitVisible}
            mainView={
              <div className="h-full w-full min-h-0 min-w-0 flex flex-col overflow-hidden">
                <DataViewer
                  filters={filters}
                  sqlQuery={sqlQuery}
                  searchMode={searchMode}
                  onRegisterSearch={(searchFn) => {
                    dataViewerSearchRef.current = searchFn;
                  }}
                />
              </div>
            }
            auxiliaryView={
              <div className="h-full w-full min-h-0 min-w-0 overflow-auto grid place-items-center text-center">
                <h1>Hello World</h1>
              </div>
            }
          />
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
