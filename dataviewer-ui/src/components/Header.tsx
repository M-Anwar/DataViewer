import * as api from "@/services/api";
import { Button } from "primereact/button";
import {
  SelectButton,
  type SelectButtonChangeEvent,
} from "primereact/selectbutton";
import { useState } from "react";

import { Divider } from "primereact/divider";
import { Bookmarks } from "./Bookmarks";
import { ConfigSidebar } from "./ConfigSidebar";
import Filters from "./DataViewer/Filters";

import { InputTextarea } from "primereact/inputtextarea";

interface HeaderProps {
  filters: api.Filter[];
  sqlQuery?: string;
  searchMode: "Quick Filters" | "SQL Editor";
  dockMode?: "hidden" | "horizontal" | "vertical";
  setSearchMode?: (mode: "Quick Filters" | "SQL Editor") => void;
  onFiltersChange?: (filters: api.Filter[]) => void;
  onAddFilter?: (filter: api.Filter) => void;
  onUpdateFilter?: (idx: number, filter: api.Filter) => void;
  onRemoveFilter?: (idx: number) => void;
  onClearFilters?: () => void;
  onSQLQueryChange?: (sql: string) => void;
  onSearch?: () => void;
  onToggleSplitMode?: () => void;
}
export function Header({
  filters,
  sqlQuery,
  searchMode,
  dockMode = "hidden",
  onFiltersChange,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onClearFilters,
  onSQLQueryChange,
  onSearch,
  onToggleSplitMode,
  setSearchMode,
}: HeaderProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const searchOptions: string[] = ["Quick Filters", "SQL Editor"];

  const splitToggleIcon =
    dockMode === "hidden"
      ? "pi pi-window-maximize"
      : dockMode === "horizontal"
        ? "pi pi-arrows-h"
        : "pi pi-arrows-v";

  return (
    <div className="w-full p-2 border-b bg-gray-900 border-gray-800 flex flex-row items-center gap-2">
      <div className="shrink-0 flex flex-row gap-2">
        <SelectButton
          allowEmpty={false}
          className="no-focus"
          value={searchMode}
          options={searchOptions}
          onChange={(e: SelectButtonChangeEvent) =>
            setSearchMode?.(e.value as "Quick Filters" | "SQL Editor")
          }
        />
        <Divider layout="vertical" className="mx-0" />
      </div>
      {searchMode === "Quick Filters" && (
        <Filters
          filters={filters}
          onAddFilter={onAddFilter}
          onUpdateFilter={onUpdateFilter}
          onRemoveFilter={onRemoveFilter}
          onClearFilters={onClearFilters}
        />
      )}

      {searchMode === "SQL Editor" && (
        <div className="flex flex-row grow items-center gap-2">
          <InputTextarea
            value={sqlQuery}
            onChange={(e) => onSQLQueryChange?.(e.target.value)}
            rows={1}
            className="w-full"
          />
        </div>
      )}

      <div className="flex flex-row shrink-0 items-center gap-2">
        <Divider layout="vertical" className="mx-0" />
        <Button
          className="no-focus"
          label="Search"
          severity="success"
          raised
          onClick={() => onSearch?.()}
        ></Button>
        <Bookmarks
          filters={filters}
          sqlQuery={sqlQuery}
          searchMode={searchMode}
          onApplySearchMode={(mode) => setSearchMode?.(mode)}
          onApplyQuickFilters={(nextFilters) => onFiltersChange?.(nextFilters)}
          onApplySqlQuery={(query) => onSQLQueryChange?.(query)}
        />
        <Button
          className="no-focus"
          icon="pi pi-cog"
          rounded
          size="large"
          outlined
          onClick={() => setIsSidebarVisible(true)}
        />
        <Button
          className="no-focus"
          icon={splitToggleIcon}
          rounded
          size="large"
          outlined
          aria-label="Toggle split layout"
          onClick={() => onToggleSplitMode?.()}
        />
        <ConfigSidebar
          visible={isSidebarVisible}
          onHide={() => setIsSidebarVisible(false)}
        />
      </div>
    </div>
  );
}
