import { useApp } from "@/contexts/AppContext";
import * as api from "@/services/api";
import { Badge } from "primereact/badge";
import { Button } from "primereact/button";
import { Chip } from "primereact/chip";
import {
  SelectButton,
  type SelectButtonChangeEvent,
} from "primereact/selectbutton";
import { Tooltip } from "primereact/tooltip";
import { useState } from "react";

import { Divider } from "primereact/divider";
import Filters from "./Filters";

import { InputTextarea } from "primereact/inputtextarea";
import { Sidebar } from "primereact/sidebar";

interface HeaderProps {
  filters: api.Filter[];
  sqlQuery?: string;
  searchMode: "Quick Filters" | "SQL Editor";
  setSearchMode?: (mode: "Quick Filters" | "SQL Editor") => void;
  onAddFilter?: (filter: api.Filter) => void;
  onUpdateFilter?: (idx: number, filter: api.Filter) => void;
  onRemoveFilter?: (idx: number) => void;
  onSQLQueryChange?: (sql: string) => void;
  onSearch?: () => void;
}
export function Header({
  filters,
  sqlQuery,
  searchMode,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onSQLQueryChange,
  onSearch,
  setSearchMode,
}: HeaderProps) {
  const { pingResult } = useApp();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const datasetPath = pingResult?.configuration?.dataset_path as
    | string
    | undefined;
  const datasetName = pingResult?.configuration?.dataset_name as
    | string
    | undefined;
  const datasetFormat = pingResult?.configuration?.dataset_format as
    | string
    | undefined;

  const numRows = pingResult?.dataset_info.num_rows as number | 0;

  const searchOptions: string[] = ["Quick Filters", "SQL Editor"];

  // Name is the concatenation of the dataset format and name separated by a |
  const name = datasetName
    ? datasetFormat
      ? `${datasetFormat} | ${datasetName}`
      : datasetName
    : "Unknown Dataset";

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
        <Button
          className="no-focus"
          icon="pi pi-cog"
          rounded
          size="large"
          outlined
          onClick={() => setIsSidebarVisible(true)}
        />
        <Sidebar
          visible={isSidebarVisible}
          position="right"
          onHide={() => setIsSidebarVisible(false)}
          className="w-3xl"
        >
          <div className="flex gap-4 items-center">
            <Badge value={`Num Rows: ${numRows}`} size="large" />
            <Tooltip target=".dataset-name" />
            <div
              className="dataset-name w-fit"
              data-pr-tooltip={datasetPath || "Unknown Dataset Path"}
              data-pr-position="bottom"
            >
              <Chip label={name} icon="pi pi-file" />
            </div>
          </div>
          <span> Hello world </span>
        </Sidebar>
      </div>
    </div>
  );
}
