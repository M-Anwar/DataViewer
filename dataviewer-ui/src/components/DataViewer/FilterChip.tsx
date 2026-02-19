import * as api from "@/services/api";
import { OverlayPanel } from "primereact/overlaypanel";
import { useRef } from "react";
import FilterEditor from "./FilterEditor";

interface FilterChipProps {
  column: string | null;
  operator: api.Operator | null;
  value: string | (string | null)[] | null;
  isColumnValue?: boolean;

  removable?: boolean;
  editable?: boolean;
  onUpdateFilter?: (filter: api.Filter) => void;
  onRemove?: () => void;
}

interface IconButtonProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

function IconButton({ onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-gray-300 transition hover:bg-gray-700 hover:text-white"
      onClick={onClick}
    >
      <i className="pi pi-times text-[10px]" />
    </button>
  );
}

export default function FilterChip({
  column,
  operator,
  value,
  isColumnValue,
  removable,
  editable,
  onUpdateFilter,
  onRemove,
}: FilterChipProps) {
  const editFilterOverlay: React.RefObject<OverlayPanel | null> = useRef(null);

  const displayValue = isColumnValue
    ? `Column(${value})`
    : Array.isArray(value)
      ? `[${value.map((v) => (v === null ? "null" : v)).join(", ")}]`
      : value === null
        ? "null"
        : value.toString();

  return (
    <div>
      <div
        className={`flex flex-row flex-wrap max-w-xl content-start resize-y overflow-y-auto items-center gap-2 rounded-xl ring ring-gray-700 bg-gray-900 px-6 py-2 text-md cursor-pointer transition hover:ring-gray-500`}
        onClick={(e) =>
          editable &&
          editFilterOverlay.current &&
          editFilterOverlay.current.toggle(e)
        }
      >
        <span> {column || "No Column"} </span>
        <span> {operator || "No Operator"} </span>
        <span className={isColumnValue ? "text-green-500" : ""}>
          {displayValue || "No Value"}
        </span>
        {removable && (
          <IconButton
            onClick={(event) => {
              event.stopPropagation();
              onRemove && onRemove();
            }}
          />
        )}
      </div>
      <OverlayPanel ref={editFilterOverlay}>
        <FilterEditor
          initialColumn={column}
          initialOperator={operator}
          initialValue={value}
          initialIsColumnValue={isColumnValue}
          onUpdateFilter={(f) => {
            if (onUpdateFilter) {
              onUpdateFilter(f);
            }
            editFilterOverlay.current?.hide();
          }}
        />
      </OverlayPanel>
    </div>
  );
}
