import type { RowPanelParams } from "@/components/RowPanels/types";
import { api, type SelectResponse } from "@/services/api";
import { type IDockviewPanelProps } from "dockview";
import { Tree } from "primereact/tree";
import type { TreeNode } from "primereact/treenode";
import { useEffect, useState } from "react";

const MAX_VALUE_LENGTH = 150;

type NodeDisplayData = {
  keyText?: string;
  valueText: string;
};

function truncateString(value: string): string {
  if (value.length <= MAX_VALUE_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_VALUE_LENGTH)}...`;
}

function formatPrimitive(value: unknown): string {
  if (typeof value === "string") {
    return `\"${truncateString(value)}\"`;
  }
  if (value === null) {
    return "null";
  }
  return String(value);
}

function toTreeNodes(value: unknown, keyName?: string): TreeNode[] {
  if (Array.isArray(value)) {
    const valueText = `[${value.length}]`;
    return [
      {
        key: keyName ?? "root",
        label: keyName ? `${keyName}: ${valueText}` : valueText,
        data: {
          keyText: keyName,
          valueText,
        } satisfies NodeDisplayData,
        children: value.flatMap((item, index) =>
          toTreeNodes(item, `[${index}]`),
        ),
      },
    ];
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const valueText = `{${entries.length}}`;
    return [
      {
        key: keyName ?? "root",
        label: keyName ? `${keyName}: ${valueText}` : valueText,
        data: {
          keyText: keyName,
          valueText,
        } satisfies NodeDisplayData,
        children: entries.flatMap(([entryKey, entryValue]) =>
          toTreeNodes(entryValue, entryKey),
        ),
      },
    ];
  }

  return [
    {
      key: keyName ?? "value",
      label: keyName
        ? `${keyName}: ${formatPrimitive(value)}`
        : formatPrimitive(value),
      data: {
        keyText: keyName,
        valueText: formatPrimitive(value),
      } satisfies NodeDisplayData,
      leaf: true,
    },
  ];
}

function nodeTemplate(node: TreeNode) {
  const display = node.data as NodeDisplayData | undefined;

  if (!display) {
    return <span>{String(node.label ?? "")}</span>;
  }

  return (
    <span>
      {display.keyText && (
        <span className="font-semibold text-green-500">
          {display.keyText}:{" "}
        </span>
      )}
      <span>{display.valueText}</span>
    </span>
  );
}

export default function DefaultRowPanel({
  params,
}: IDockviewPanelProps<RowPanelParams>) {
  const [result, setResult] = useState<SelectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const treeNodes = result === null ? [] : toTreeNodes(result);

  useEffect(() => {
    const rowId = params?.id;
    if (!rowId) {
      setResult(null);
      setError("Missing row id");
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void api
      .select(rowId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setResult(response);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Failed to load row details";
        setError(message);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  return (
    <div className="h-full w-full min-h-0 min-w-0 overflow-auto p-3 text-sm text-gray-300">
      {isLoading && <div>Loading row details...</div>}
      {!isLoading && error && <div>{error}</div>}
      {!isLoading && !error && (
        <Tree
          className="default-row-panel-tree"
          value={treeNodes}
          nodeTemplate={nodeTemplate}
        />
      )}
    </div>
  );
}
