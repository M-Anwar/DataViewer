import * as api from "@/services/api";
import { useCallback, useState } from "react";

type ParsedType =
  | { kind: "binary"; hasBinary: true }
  | { kind: "list"; itemType: ParsedType; hasBinary: boolean }
  | { kind: "struct"; fields: Record<string, ParsedType>; hasBinary: boolean }
  | { kind: "other"; hasBinary: false };

const OTHER_TYPE: ParsedType = { kind: "other", hasBinary: false };

function splitTopLevel(value: string, delimiter = ","): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "<") {
      depth += 1;
      continue;
    }
    if (char === ">") {
      depth -= 1;
      continue;
    }
    if (char === delimiter && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  const tail = value.slice(start).trim();
  if (tail.length > 0) {
    parts.push(tail);
  }

  return parts;
}

function stripNullability(typeText: string): string {
  return typeText.replace(/\s+not\s+null$/i, "").trim();
}

function parseType(typeText: string): ParsedType {
  const normalized = stripNullability(typeText.trim());

  if (
    normalized === "binary" ||
    normalized === "large_binary" ||
    /^fixed_size_binary\[\d+\]$/i.test(normalized)
  ) {
    return { kind: "binary", hasBinary: true };
  }

  if (
    normalized.startsWith("list<") ||
    normalized.startsWith("large_list<") ||
    normalized.startsWith("fixed_size_list<")
  ) {
    const start = normalized.indexOf("<");
    const end = normalized.lastIndexOf(">");
    if (start === -1 || end <= start) {
      return OTHER_TYPE;
    }

    const inner = normalized.slice(start + 1, end).trim();
    const colonIndex = inner.indexOf(":");
    const itemTypeText =
      colonIndex >= 0 ? inner.slice(colonIndex + 1).trim() : inner;
    const itemType = parseType(itemTypeText);

    return {
      kind: "list",
      itemType,
      hasBinary: itemType.hasBinary,
    };
  }

  if (normalized.startsWith("struct<")) {
    const start = normalized.indexOf("<");
    const end = normalized.lastIndexOf(">");
    if (start === -1 || end <= start) {
      return OTHER_TYPE;
    }

    const inner = normalized.slice(start + 1, end).trim();
    const fieldSpecs = splitTopLevel(inner);
    const fields: Record<string, ParsedType> = {};
    let hasBinary = false;

    for (const fieldSpec of fieldSpecs) {
      const colonIndex = fieldSpec.indexOf(":");
      if (colonIndex === -1) {
        continue;
      }

      const fieldName = fieldSpec.slice(0, colonIndex).trim();
      const fieldTypeText = fieldSpec.slice(colonIndex + 1).trim();
      const parsedFieldType = parseType(fieldTypeText);
      fields[fieldName] = parsedFieldType;
      hasBinary = hasBinary || parsedFieldType.hasBinary;
    }

    return {
      kind: "struct",
      fields,
      hasBinary,
    };
  }

  return OTHER_TYPE;
}

function tryDecodeBase64(value: string): Uint8Array | string {
  try {
    const decoded = globalThis.atob(value);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }
    return bytes;
  } catch {
    return value;
  }
}

function decodeValueWithType(value: unknown, parsedType: ParsedType): unknown {
  if (value === null || value === undefined || !parsedType.hasBinary) {
    return value;
  }

  if (parsedType.kind === "binary") {
    return typeof value === "string" ? tryDecodeBase64(value) : value;
  }

  if (parsedType.kind === "list") {
    if (!Array.isArray(value)) {
      return value;
    }
    return value.map((item) => decodeValueWithType(item, parsedType.itemType));
  }

  if (parsedType.kind === "struct") {
    if (typeof value !== "object" || Array.isArray(value)) {
      return value;
    }

    const objectValue = value as Record<string, unknown>;
    const decodedObject: Record<string, unknown> = { ...objectValue };

    for (const [fieldName, fieldType] of Object.entries(parsedType.fields)) {
      if (!(fieldName in objectValue)) {
        continue;
      }
      decodedObject[fieldName] = decodeValueWithType(
        objectValue[fieldName],
        fieldType,
      );
    }

    return decodedObject;
  }

  return value;
}

export function decodeBinaryValuesFromSchema(
  data: Array<Record<string, unknown>>,
  schema: api.SchemaField[],
): Array<Record<string, unknown>> {
  const parsedSchema = schema
    .map((field) => ({
      name: field.name,
      parsedType: parseType(field.type),
    }))
    .filter((field) => field.parsedType.hasBinary);

  if (parsedSchema.length === 0) {
    return data;
  }

  return data.map((row) => {
    const decodedRow: Record<string, unknown> = { ...row };
    for (const field of parsedSchema) {
      if (!(field.name in row)) {
        continue;
      }
      decodedRow[field.name] = decodeValueWithType(
        row[field.name],
        field.parsedType,
      );
    }
    return decodedRow;
  });
}

interface UseDataOptions {
  pingResult?: api.PingResponse | null;
}

interface UseDataResult {
  data: Array<Record<string, unknown>>;
  schema: api.SchemaField[];
  total_rows: number;
  execution_time_ms: number;
  isLoading: boolean;
  error: Error | null;
  search: (params: api.SearchRequest) => Promise<void>;
}

export function useData({ pingResult }: UseDataOptions = {}): UseDataResult {
  const [data, setData] = useState<Array<Record<string, unknown>>>([]);
  const [schema, setSchema] = useState<api.SchemaField[]>([]);
  const [total_rows, setTotalRows] = useState(0);
  const [execution_time_ms, setExecutionTimeMs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  void pingResult;

  const search = useCallback(
    async (params: api.SearchRequest) => {
      if (pingResult === null) {
        const error = new Error(
          "Cannot perform search. Service Metadata is Missing.",
        );
        setError(error);
        throw error;
      }
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.api.search(params);
        const decodedData = decodeBinaryValuesFromSchema(
          response.data,
          response.schema,
        );
        setData(decodedData);
        setSchema(response.schema);
        setTotalRows(response.total_rows);
        setExecutionTimeMs(response.execution_time_ms);
      } catch (err) {
        const resolvedError =
          err instanceof Error ? err : new Error("Search request failed");
        setError(resolvedError);
        throw resolvedError;
      } finally {
        setIsLoading(false);
      }
    },
    [pingResult],
  );

  return {
    data,
    schema,
    total_rows,
    execution_time_ms,
    isLoading,
    error,
    search,
  };
}
