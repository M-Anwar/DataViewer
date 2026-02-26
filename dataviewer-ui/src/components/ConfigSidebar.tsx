import { useApp } from "@/contexts/AppContext";
import { Badge } from "primereact/badge";
import { Chip } from "primereact/chip";
import {
  MultiSelect,
  type MultiSelectChangeEvent,
} from "primereact/multiselect";
import { Panel } from "primereact/panel";
import { Sidebar } from "primereact/sidebar";
import { Tooltip } from "primereact/tooltip";
import { useMemo } from "react";

interface ConfigSidebarProps {
  visible: boolean;
  onHide: () => void;
}

export function ConfigSidebar({ visible, onHide }: ConfigSidebarProps) {
  const { pingResult, globalConfig, setHiddenColumns, setFrozenColumns } =
    useApp();

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

  const hiddenColumnOptions = useMemo(
    () =>
      (pingResult?.dataset_info.full_schema ?? []).map((column) => ({
        label: column.name,
        value: column.name,
      })),
    [pingResult],
  );

  const name = datasetName
    ? datasetFormat
      ? `${datasetFormat} | ${datasetName}`
      : datasetName
    : "Unknown Dataset";

  return (
    <Sidebar
      visible={visible}
      position="right"
      onHide={onHide}
      className="w-3xl"
      header="Settings"
    >
      <div className="flex gap-4 items-center">
        <Badge value={`Num Rows: ${numRows?.toLocaleString()}`} size="large" />
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
              {JSON.stringify(pingResult?.dataset_info?.full_schema, null, 2) ||
                "No Schema"}
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
  );
}
