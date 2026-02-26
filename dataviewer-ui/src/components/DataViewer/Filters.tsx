import * as api from "@/services/api";

import { OverlayPanel } from "primereact/overlaypanel";
import { SplitButton } from "primereact/splitbutton";
import { useRef } from "react";
import FilterChip from "./FilterChip";
import FilterEditor from "./FilterEditor";

interface FilterProps {
  filters: api.Filter[];
  onUpdateFilter?: (idx: number, filter: api.Filter) => void;
  onAddFilter?: (filter: api.Filter) => void;
  onRemoveFilter?: (idx: number) => void;
  onClearFilters?: () => void;
}

export default function Filters({
  filters,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onClearFilters,
}: FilterProps) {
  const addFilterOverlay: React.RefObject<OverlayPanel | null> = useRef(null);

  const addFilterMenuItems = [
    {
      label: "Clear all filters",
      icon: "pi pi-trash",
      command: () => onClearFilters?.(),
    },
  ];

  return (
    <div className="flex flex-row grow items-center gap-2">
      <div className="shrink-0 relative">
        <SplitButton
          className="no-focus"
          icon="pi pi-plus"
          label="Add Filter"
          rounded
          aria-label="Filter"
          model={addFilterMenuItems}
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
