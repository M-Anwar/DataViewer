import type { PingResponse } from "./services/api";

interface DataViewerProps {
  pingResult: PingResponse | null;
}
export default function DataViewer({ pingResult }: DataViewerProps) {
  return (
    <div className="h-full w-full grid place-items-center text-center">
      <h1>DataViewer</h1>
      {pingResult ? (
        <span>{JSON.stringify(pingResult)}</span>
      ) : (
        <span>Loading...</span>
      )}
    </div>
  );
}
