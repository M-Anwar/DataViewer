import { useApp } from "@/contexts/AppContext";
import { useData } from "@/hooks/useData";
import * as api from "@/services/api";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Header } from "./Header";

interface DataViewerProps {
  filters: api.Filter[];
  sqlQuery?: string;
  onAddFilter?: (filter: api.Filter) => void;
  onUpdateFilter?: (idx: number, filter: api.Filter) => void;
  onRemoveFilter?: (idx: number) => void;
  onSQLQueryChange?: (sql: string) => void;
}

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

export default function DataViewer({
  filters,
  sqlQuery,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onSQLQueryChange,
}: DataViewerProps) {
  const { pingResult, error: appError } = useApp();
  const { data, schema, total_rows, execution_time_ms, isLoading, search } =
    useData({
      pingResult,
    });
  const didInitialSearch = useRef(false);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);
  const [rowFontSize, setRowFontSize] = useState(0.95);
  const [frozenColumns] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<"Quick Filters" | "SQL Editor">(
    "Quick Filters",
  );
  const [shouldPageSearch, setShouldPageSearch] = useState(false);

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

  const simpleFields = useMemo(
    () => schema.filter((field) => isSimpleSchemaType(field.type)),
    [schema],
  );

  const complexFields = useMemo(
    () => schema.filter((field) => !isSimpleSchemaType(field.type)),
    [schema],
  );

  const tableData = useMemo(() => {
    if (simpleFields.length === 0) {
      return data.map((_, index) => ({ __rowIndex: index }));
    }

    return data.map((row, index) => {
      const projectedRow: Record<string, unknown> = { __rowIndex: index };
      for (const field of simpleFields) {
        projectedRow[field.name] = row[field.name];
      }
      return projectedRow;
    });
  }, [data, simpleFields]);

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

  const tableStyle = useMemo(
    () =>
      ({
        "--data-row-font-size": `${rowFontSize}rem`,
      }) as CSSProperties,
    [rowFontSize],
  );

  return (
    <div className="h-full w-full flex flex-col">
      <Header
        filters={filters}
        sqlQuery={sqlQuery}
        searchMode={searchMode}
        setSearchMode={setSearchMode}
        onAddFilter={onAddFilter}
        onUpdateFilter={onUpdateFilter}
        onRemoveFilter={onRemoveFilter}
        onSQLQueryChange={onSQLQueryChange}
        onSearch={handleSearch}
      />
      {appError ? (
        <div className="p-4">
          <span className="text-red-500">Error: {appError.message}</span>
        </div>
      ) : pingResult ? (
        <div className="p-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          <DataTable
            className="data-viewer-table flex-1 min-h-0"
            style={tableStyle}
            reorderableColumns
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
          >
            {simpleFields.map((field) => {
              const isFrozen = frozenColumns.includes(field.name);
              return (
                <Column
                  key={field.name}
                  field={field.name}
                  header={field.name}
                  frozen={isFrozen}
                  alignFrozen={isFrozen ? "left" : undefined}
                />
              );
            })}
            {complexFields.map((field) => {
              const isFrozen = frozenColumns.includes(field.name);
              return (
                <Column
                  key={field.name}
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
        </div>
      ) : (
        <span>No data available</span>
      )}
    </div>
  );
}
