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
import { useMemo, useState } from "react";

import { Divider } from "primereact/divider";
import Filters from "./DataViewer/Filters";

import { InputTextarea } from "primereact/inputtextarea";
import {
  MultiSelect,
  type MultiSelectChangeEvent,
} from "primereact/multiselect";
import { Panel } from "primereact/panel";
import { Sidebar } from "primereact/sidebar";

interface HeaderProps {
  filters: api.Filter[];
  sqlQuery?: string;
  searchMode: "Quick Filters" | "SQL Editor";
  dockMode?: "hidden" | "horizontal" | "vertical";
  setSearchMode?: (mode: "Quick Filters" | "SQL Editor") => void;
  onAddFilter?: (filter: api.Filter) => void;
  onUpdateFilter?: (idx: number, filter: api.Filter) => void;
  onRemoveFilter?: (idx: number) => void;
  onSQLQueryChange?: (sql: string) => void;
  onSearch?: () => void;
  onToggleSplitMode?: () => void;
}
export function Header({
  filters,
  sqlQuery,
  searchMode,
  dockMode = "hidden",
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onSQLQueryChange,
  onSearch,
  onToggleSplitMode,
  setSearchMode,
}: HeaderProps) {
  const { pingResult, globalConfig, setHiddenColumns, setFrozenColumns } =
    useApp();
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
  const hiddenColumnOptions = useMemo(
    () =>
      (pingResult?.dataset_info.full_schema ?? []).map((column) => ({
        label: column.name,
        value: column.name,
      })),
    [pingResult],
  );

  // Name is the concatenation of the dataset format and name separated by a |
  const name = datasetName
    ? datasetFormat
      ? `${datasetFormat} | ${datasetName}`
      : datasetName
    : "Unknown Dataset";

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
        <Button
          className="no-focus"
          icon={splitToggleIcon}
          rounded
          size="large"
          outlined
          aria-label="Toggle split layout"
          onClick={() => onToggleSplitMode?.()}
        />
        <Sidebar
          visible={isSidebarVisible}
          position="right"
          onHide={() => setIsSidebarVisible(false)}
          className="w-3xl"
          header="Settings"
        >
          <div className="flex gap-4 items-center">
            <Badge
              value={`Num Rows: ${numRows?.toLocaleString()}`}
              size="large"
            />
            <Tooltip target=".dataset-name" />
            <div
              className="dataset-name w-fit"
              data-pr-tooltip={datasetPath || "Unknown Dataset Path"}
              data-pr-position="bottom"
            >
              <Chip label={name} icon="pi pi-file" />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4 text-xl">
            <Panel header="Configuration" toggleable collapsed>
              <div className="overflow-auto">
                <pre>
                  {JSON.stringify(pingResult?.configuration, null, 2) ||
                    "No Configuration"}
                </pre>
              </div>
            </Panel>
            <Panel header="Schema" toggleable collapsed>
              <div className="overflow-auto">
                <pre>
                  {JSON.stringify(
                    pingResult?.dataset_info?.full_schema,
                    null,
                    2,
                  ) || "No Schema"}
                </pre>
              </div>
            </Panel>
            <div className="flex flex-col gap-2 mt-4">
              <label
                htmlFor="hidden-columns-select"
                className="text-lg font-medium"
              >
                Hidden Columns
              </label>
              <MultiSelect
                inputId="hidden-columns-select"
                options={hiddenColumnOptions}
                value={globalConfig.hidden_columns}
                onChange={(event: MultiSelectChangeEvent) =>
                  setHiddenColumns(event.value as string[])
                }
                display="chip"
                filter
                placeholder="Select columns"
                className="w-full hidden-columns-select"
              />
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <label
                htmlFor="frozen-columns-select"
                className="text-lg font-medium"
              >
                Frozen Columns
              </label>
              <MultiSelect
                inputId="frozen-columns-select"
                options={hiddenColumnOptions}
                value={globalConfig.frozen_columns}
                onChange={(event: MultiSelectChangeEvent) =>
                  setFrozenColumns(event.value as string[])
                }
                display="chip"
                filter
                placeholder="Select columns"
                className="w-full hidden-columns-select"
              />
            </div>
          </div>
        </Sidebar>
      </div>
    </div>
  );
}
