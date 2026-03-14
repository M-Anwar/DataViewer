import { useApp } from "@/contexts/AppContext";
import { Dropdown } from "primereact/dropdown";
import { useMemo, useState } from "react";
import * as api from "@/services/api";
import { Button } from "primereact/button";

interface SortProps {
  sorts: api.Sort[];
  onAddSort?: (sort: api.Sort) => void;
  onRemoveSort?: (idx: number) => void;
  onClearSorts?: () => void;
}

export default function SortEditor({
  sorts,
  onAddSort,
  onRemoveSort,
  onClearSorts,
}: SortProps) {
  const { pingResult } = useApp();
  const columns = useMemo(() => {
    if (!pingResult) return [];
    return pingResult.dataset_info.full_schema.map((col) => ({
      name: col.name,
      type: col.type,
    }));
  }, [pingResult]);

  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [selectedSortOrder, setSelectedSortOrder] = useState<"asc" | "desc">(
    "asc",
  );

  return (
    <div>
      <div className="flex flex-row gap-1">
        <Dropdown
          value={selectedColumn}
          options={columns}
          optionLabel="name"
          optionValue="name"
          onChange={(e) => setSelectedColumn(e.value)}
          placeholder="Select a column"
          filter
          filterDelay={10}
        />
        <Dropdown
          value={selectedSortOrder}
          options={["asc", "desc"]}
          onChange={(e) => setSelectedSortOrder(e.value)}
          placeholder="Select a sort order"
        />
        <Button
          label="Add Sort"
          onClick={() => {
            if (selectedColumn && selectedSortOrder) {
              onAddSort?.({
                column: selectedColumn,
                descending: selectedSortOrder === "desc",
              });
            }
          }}
        />
      </div>

      <div>
        {sorts?.map((sort, idx) => (
          <div
            key={idx}
            className="flex flex-row gap-2 items-center border my-2 py-0 px-2 rounded-xl"
          >
            <span>{sort.column}</span>
            <span>{sort.descending ? "desc" : "asc"}</span>
            <Button
              icon="pi pi-times"
              className="p-button-rounded p-button-text p-button-danger"
              onClick={() => onRemoveSort?.(idx)}
            />
          </div>
        ))}
        {sorts?.length > 0 && (
          <Button
            label="Clear Sorts"
            className="p-button-danger"
            onClick={onClearSorts}
          />
        )}
      </div>
    </div>
  );
}
