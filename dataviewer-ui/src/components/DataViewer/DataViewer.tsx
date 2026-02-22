import { useApp } from "@/contexts/AppContext";
import { useData } from "@/hooks/useData";
import * as api from "@/services/api";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { ContextMenu } from "primereact/contextmenu";
import {
  DataTable,
  type DataTableCellClickEvent,
  type DataTablePageEvent,
} from "primereact/datatable";
import type { MenuItem } from "primereact/menuitem";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  CellPreviewSidebar,
  type SelectedCellPreview,
} from "./CellPreviewSidebar";
import { ImageBinaryCell } from "./ImageBinaryCell";

interface DataViewerProps {
  filters: api.Filter[];
  sqlQuery?: string;
  searchMode: "Quick Filters" | "SQL Editor";
  onRegisterSearch?: (searchFn: () => void) => void;
}

type TableRow = {
  __rowIndex: number;
} & Record<string, unknown>;

type DataViewerTableStyle = CSSProperties & {
  "--data-row-font-size": string;
};

type ViewerConfiguration = {
  id_column?: string;
  image_columns?: string[];
};

function isSimpleSchemaType(typeText: string): boolean {
  // Normalize schema type text by stripping trailing nullability markers and
  // lowercasing for consistent comparisons.
  const normalized = typeText
    .replace(/\s+not\s+null$/i, "")
    .trim()
    .toLowerCase();

  if (
    normalized === "string" ||
    normalized === "utf8" ||
    normalized === "large_string" ||
    normalized === "bool" ||
    normalized === "boolean" ||
    normalized.startsWith("int") ||
    normalized.startsWith("uint") ||
    normalized.startsWith("float") ||
    normalized.startsWith("decimal") ||
    normalized.startsWith("date") ||
    normalized.startsWith("timestamp")
  ) {
    return true;
  }

  return false;
}

function tryDecodeUint8ArrayToText(bytes: Uint8Array): string | null {
  if (bytes.length === 0) {
    return "";
  }

  let decoded = "";
  try {
    decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return null;
  }

  return decoded;
}

function formatCellValue(
  value: unknown,
  options?: { isImageColumn?: boolean; columnName?: string },
): ReactNode {
  if (options?.isImageColumn) {
    const imageValues =
      Array.isArray(value) && value.every((item) => item instanceof Uint8Array)
        ? value
        : [value];

    return (
      <div className="flex flex-col gap-2">
        {imageValues.map((imageValue, index) => (
          <ImageBinaryCell
            key={`${options.columnName ?? "image"}-${index}`}
            value={imageValue}
            alt={`${options.columnName ?? "image"}-${index + 1}`}
          />
        ))}
      </div>
    );
  }

  let textValue: string;

  if (value === null) {
    textValue = "null";
  } else if (value === undefined) {
    textValue = "undefined";
  } else if (typeof value === "string") {
    textValue = value;
  } else if (value instanceof Uint8Array) {
    const textView = tryDecodeUint8ArrayToText(value);
    if (textView !== null) {
      textValue = textView;
    } else {
      const preview = Array.from(value.slice(0, 64)).join(", ");
      const suffix = value.length > 64 ? ", ..." : "";
      textValue = `Uint8Array(${value.length}) [${preview}${suffix}]`;
    }
  } else if (value instanceof ArrayBuffer) {
    textValue = `ArrayBuffer(${value.byteLength})`;
  } else if (typeof value === "object") {
    try {
      console.log("Object type detected, attempting to stringify", value);
      textValue = JSON.stringify(value, null, 2);
    } catch {
      console.log("Failing to stringify value", value);
      textValue = String(value);
    }
  } else {
    textValue = String(value);
  }

  return (
    <pre
      className="m-0 whitespace-pre-wrap break-words text-sm leading-6"
      style={{ whiteSpace: "pre-wrap" }}
    >
      {textValue}
    </pre>
  );
}

export default function DataViewer({
  filters,
  sqlQuery,
  searchMode,
  onRegisterSearch,
}: DataViewerProps) {
  const { pingResult, error: appError, globalConfig } = useApp();
  const { data, schema, total_rows, execution_time_ms, isLoading, search } =
    useData({
      pingResult,
    });
  const didInitialSearch = useRef(false);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);
  const [rowFontSize, setRowFontSize] = useState(0.95);
  const [frozenColumns] = useState<string[]>([]);
  const [shouldPageSearch, setShouldPageSearch] = useState(false);
  const [isCellSidebarVisible, setCellSidebarVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState<SelectedCellPreview | null>(
    null,
  );
  const [contextMenuRow, setContextMenuRow] = useState<TableRow | null>(null);
  const rowContextMenuRef = useRef<ContextMenu>(null);

  const rowContextMenuItems = useMemo<MenuItem[]>(
    () => [
      {
        label: "Open Default Row Viewer",
      },
      {
        label: "Open Custom Row Viewer",
      },
    ],
    [],
  );

  const handleSearch = useCallback(() => {
    if (pingResult === null) {
      return;
    }

    const isSqlMode = searchMode === "SQL Editor";
    const hasSqlQuery = Boolean(sqlQuery && sqlQuery.trim().length > 0);

    const request: api.SearchRequest = {
      page: Math.floor(first / rows),
      page_size: rows,
      filters: !isSqlMode && filters.length > 0 ? filters : undefined,
      raw_query: isSqlMode && hasSqlQuery ? sqlQuery : null,
    };

    search(request);
  }, [filters, pingResult, first, rows, search, searchMode, sqlQuery]);

  useEffect(() => {
    onRegisterSearch?.(handleSearch);
  }, [handleSearch, onRegisterSearch]);

  useEffect(() => {
    if (didInitialSearch.current) {
      return;
    }

    if (pingResult === null) {
      return;
    }

    didInitialSearch.current = true;
    handleSearch();
  }, [handleSearch, pingResult]);

  useEffect(() => {
    if (!shouldPageSearch) {
      return;
    }

    handleSearch();
    setShouldPageSearch(false);
  }, [handleSearch, searchMode, shouldPageSearch]);

  const handlePageChange = useCallback((event: DataTablePageEvent) => {
    setRows(event.rows);
    setFirst(event.first);
    setShouldPageSearch(true);
  }, []);

  const configuration = useMemo(
    () => pingResult?.configuration as ViewerConfiguration | undefined,
    [pingResult],
  );

  const hiddenColumns = useMemo(
    () => new Set(globalConfig.hidden_columns),
    [globalConfig.hidden_columns],
  );

  const orderedFields = useMemo(() => {
    const fieldsByName = new Map(schema.map((field) => [field.name, field]));
    const ordered: api.SchemaField[] = [];
    const added = new Set<string>();

    const pushByName = (name: string | undefined) => {
      if (!name || added.has(name) || hiddenColumns.has(name)) {
        return;
      }

      const field = fieldsByName.get(name);
      if (!field) {
        return;
      }

      ordered.push(field);
      added.add(name);
    };

    for (const frozenColumn of frozenColumns) {
      pushByName(frozenColumn);
    }

    pushByName(configuration?.id_column);

    for (const column of configuration?.image_columns ?? []) {
      pushByName(column);
    }

    for (const field of schema) {
      pushByName(field.name);
    }

    return ordered;
  }, [configuration, frozenColumns, hiddenColumns, schema]);

  const imageColumns = useMemo(() => {
    return new Set(configuration?.image_columns ?? []);
  }, [configuration]);

  const handleCellClick = useCallback(
    (event: DataTableCellClickEvent<TableRow[]>) => {
      const { field } = event;
      if (typeof field !== "string") {
        return;
      }

      const rowData = event.rowData as TableRow;

      const sourceRow = data[rowData.__rowIndex];
      if (!sourceRow) {
        return;
      }

      const rawValue = sourceRow[field];
      setSelectedCell({
        column: field,
        rowIndex: rowData.__rowIndex,
        rawValue,
        formattedValue: formatCellValue(rawValue, {
          isImageColumn: imageColumns.has(field),
          columnName: field,
        }),
      });
      setCellSidebarVisible(true);
    },
    [data, imageColumns],
  );

  const projectedFields = useMemo(
    () => orderedFields.filter((field) => isSimpleSchemaType(field.type)),
    [orderedFields],
  );

  const tableData = useMemo(() => {
    if (projectedFields.length === 0) {
      return data.map((_, index) => ({ __rowIndex: index }) as TableRow);
    }

    return data.map((row, index) => {
      const projectedRow: TableRow = { __rowIndex: index };
      for (const field of projectedFields) {
        projectedRow[field.name] = row[field.name];
      }
      return projectedRow;
    });
  }, [data, projectedFields]);

  const paginatorLeft = useMemo(
    () => (
      <div className="text-md text-muted-foreground flex items-center gap-3">
        <Button
          text
          size="small"
          label="A-"
          onClick={() =>
            setRowFontSize((current) => Math.max(0.75, current - 0.05))
          }
        />
        <Button
          text
          size="small"
          label="A+"
          onClick={() =>
            setRowFontSize((current) => Math.min(1.5, current + 0.05))
          }
        />
        <span>
          rows: {total_rows} · cols: {schema.length} · execution:{" "}
          {execution_time_ms.toFixed(2)}ms · loaded rows: {data.length}
        </span>
      </div>
    ),
    [data.length, execution_time_ms, schema.length, total_rows],
  );

  const tableStyle = useMemo<DataViewerTableStyle>(
    () => ({
      "--data-row-font-size": `${rowFontSize}rem`,
    }),
    [rowFontSize],
  );

  return appError ? (
    <div className="p-4">
      <span className="text-red-500">Error: {appError.message}</span>
    </div>
  ) : pingResult ? (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <ContextMenu
        model={rowContextMenuItems}
        ref={rowContextMenuRef}
        onHide={() => setContextMenuRow(null)}
      />
      <DataTable
        className="data-viewer-table flex-1 min-h-0"
        style={tableStyle}
        resizableColumns
        columnResizeMode="expand"
        showGridlines
        value={tableData}
        dataKey="__rowIndex"
        paginator
        paginatorLeft={paginatorLeft}
        lazy
        scrollable
        stripedRows
        scrollHeight="flex"
        first={first}
        rows={rows}
        totalRecords={total_rows}
        onPage={handlePageChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
        tableStyle={{ minWidth: "50rem" }}
        emptyMessage="No data to display"
        loading={isLoading}
        cellSelection
        selectionMode="single"
        onCellClick={handleCellClick}
        onContextMenu={(event) =>
          rowContextMenuRef.current?.show(event.originalEvent)
        }
        contextMenuSelection={contextMenuRow ?? undefined}
        onContextMenuSelectionChange={(event: { value: unknown }) =>
          setContextMenuRow((event.value as TableRow | null) ?? null)
        }
      >
        {orderedFields.map((field) => {
          const isFrozen = frozenColumns.includes(field.name);
          const isSimple = isSimpleSchemaType(field.type);
          const isImageColumn = imageColumns.has(field.name);

          if (isImageColumn) {
            return (
              <Column
                key={field.name}
                field={field.name}
                header={field.name}
                frozen={isFrozen}
                alignFrozen={isFrozen ? "left" : undefined}
                body={(rowData: TableRow) => {
                  const imageValue = data[rowData.__rowIndex]?.[field.name];
                  return (
                    <ImageBinaryCell value={imageValue} alt={field.name} />
                  );
                }}
              />
            );
          }

          if (isSimple) {
            return (
              <Column
                key={field.name}
                field={field.name}
                header={field.name}
                frozen={isFrozen}
                alignFrozen={isFrozen ? "left" : undefined}
              />
            );
          }

          return (
            <Column
              key={field.name}
              field={field.name}
              header={field.name}
              frozen={isFrozen}
              alignFrozen={isFrozen ? "left" : undefined}
              body={() => (
                <span className="text-muted-foreground italic whitespace-normal break-words">
                  Complex ({field.type})
                </span>
              )}
            />
          );
        })}
      </DataTable>
      <CellPreviewSidebar
        visible={isCellSidebarVisible}
        onHide={() => setCellSidebarVisible(false)}
        selectedCell={selectedCell}
      />
    </div>
  ) : (
    <span>No data available</span>
  );
}
