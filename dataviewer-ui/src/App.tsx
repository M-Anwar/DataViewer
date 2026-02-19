import { type Filter } from "@/services/api";
import { useState } from "react";
import DataViewer from "./components/DataViewer/DataViewer";
import SplitHolder from "./components/SplitHolder";
import { AppProvider } from "./contexts/AppContext";

function App() {
  const [dockDirection, setDockDirection] = useState<"vertical" | "horizontal">(
    "vertical",
  );
  const [dockVisible, setDockVisible] = useState(false);

  const [filters, setFilters] = useState<Filter[]>([]);
  const [sqlQuery, setSQLQuery] = useState<string>(
    "SELECT * FROM dataset LIMIT 10 OFFSET 0;",
  );

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

  return (
    <AppProvider>
      <div className="fixed h-screen w-screen">
        <SplitHolder
          splitDirection={dockDirection}
          splitVisible={dockVisible}
          mainView={
            <DataViewer
              filters={filters}
              onAddFilter={onAddFilter}
              onRemoveFilter={onRemoveFilter}
              onUpdateFilter={onUpdateFilter}
              sqlQuery={sqlQuery}
              onSQLQueryChange={setSQLQuery}
            />
          }
          auxiliaryView={
            <div className="h-full grid place-items-center text-center">
              <h1>Hello World</h1>
            </div>
          }
        />
      </div>
    </AppProvider>
  );
}

export default App;
