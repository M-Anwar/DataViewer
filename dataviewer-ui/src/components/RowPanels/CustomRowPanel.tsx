import type { RowPanelParams } from "@/components/RowPanels/types";
import { api, type VisualizationResponse } from "@/services/api";
import { type IDockviewPanelProps } from "dockview";
import { useCallback, useEffect, useState } from "react";

export default function CustomRowPanel({
  params,
}: IDockviewPanelProps<RowPanelParams>) {
  const [html, setHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVisualization = useCallback((rowId: string) => {
    setIsLoading(true);
    setError(null);

    return api
      .getRowVisualization({ id: rowId })
      .then((response: VisualizationResponse) => {
        if ("error" in response) {
          setHtml("");
          setError(response.error);
          return;
        }

        setHtml(response.html);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load row visualization";
        setHtml("");
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    const rowId = params?.id;

    if (!rowId) {
      setHtml("");
      setError("Missing row id");
      return;
    }

    void loadVisualization(rowId);
  }, [loadVisualization, params?.id]);

  const onReload = () => {
    const rowId = params?.id;
    if (!rowId) {
      setHtml("");
      setError("Missing row id");
      return;
    }

    void loadVisualization(rowId);
  };

  useEffect(() => {
    if (!params) {
      return;
    }

    params.onReload = onReload;

    return () => {
      if (params.onReload === onReload) {
        params.onReload = undefined;
      }
    };
  }, [onReload, params]);

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden p-3 text-sm text-gray-300">
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {isLoading && <div>Loading row visualization...</div>}
        {!isLoading && error && <div>{error}</div>}
        {!isLoading && !error && (
          <iframe
            title={`row-visualization-${params?.id ?? "unknown"}`}
            srcDoc={html}
            className="h-full w-full min-h-0 min-w-0 border-0"
          />
        )}
      </div>
    </div>
  );
}
