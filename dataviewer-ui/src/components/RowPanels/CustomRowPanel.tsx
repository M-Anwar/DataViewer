import type { RowPanelParams } from "@/components/RowPanels/types";
import { api, type VisualizationResponse } from "@/services/api";
import { type IDockviewPanelProps } from "dockview";
import { useEffect, useState } from "react";

export default function CustomRowPanel({
  params,
}: IDockviewPanelProps<RowPanelParams>) {
  const [html, setHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rowId = params?.id;

    if (!rowId) {
      setHtml("");
      setError("Missing row id");
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void api
      .getRowVisualization({ id: rowId })
      .then((response: VisualizationResponse) => {
        if (cancelled) {
          return;
        }

        if ("error" in response) {
          setHtml("");
          setError(response.error);
          return;
        }

        setHtml(response.html);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Failed to load row visualization";
        setHtml("");
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
    <div className="h-full w-full min-h-0 min-w-0 overflow-hidden p-3 text-sm text-gray-300">
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
  );
}
