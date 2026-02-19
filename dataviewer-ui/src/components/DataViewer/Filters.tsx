import * as api from "@/services/api";

import { Button } from "primereact/button";
import { OverlayPanel } from "primereact/overlaypanel";
import { useRef } from "react";
import FilterChip from "./FilterChip";
import FilterEditor from "./FilterEditor";

interface FilterProps {
  filters: api.Filter[];
  onUpdateFilter?: (idx: number, filter: api.Filter) => void;
  onAddFilter?: (filter: api.Filter) => void;
  onRemoveFilter?: (idx: number) => void;
}

export default function Filters({
  filters,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
}: FilterProps) {
  const addFilterOverlay: React.RefObject<OverlayPanel | null> = useRef(null);

  return (
    <div className="flex flex-row grow items-center gap-2">
      <div className="shrink-0">
        <Button
          className="no-focus"
          icon="pi pi-plus"
          label="Add Filter"
          badge={filters.length > 0 ? `${filters.length}` : undefined}
          rounded
          aria-label="Filter"
          onClick={(e) =>
            addFilterOverlay.current && addFilterOverlay.current.toggle(e)
          }
        />
        <OverlayPanel ref={addFilterOverlay}>
          <FilterEditor
            onUpdateFilter={(filter) => {
              if (onAddFilter) {
                onAddFilter(filter);
              }
              addFilterOverlay.current?.hide();
            }}
          />
        </OverlayPanel>
      </div>
      <div className="flex flex-wrap grow items-center ring ring-gray-800 rounded-xl gap-2 resize overflow-auto content-start p-4">
        {filters.map((filter, idx) => (
          <FilterChip
            key={idx}
            column={filter.column}
            operator={filter.operator}
            value={filter.value}
            isColumnValue={filter.is_column}
            onUpdateFilter={(updatedFilter) =>
              onUpdateFilter && onUpdateFilter(idx, updatedFilter)
            }
            onRemove={() => onRemoveFilter && onRemoveFilter(idx)}
            removable
            editable
          />
        ))}
      </div>
    </div>
  );
}
