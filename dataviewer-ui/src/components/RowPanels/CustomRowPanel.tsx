import type { RowPanelParams } from "@/components/RowPanels/types";
import { type IDockviewPanelProps } from "dockview";

export default function CustomRowPanel({
  params,
}: IDockviewPanelProps<RowPanelParams>) {
  return (
    <div className="h-full w-full min-h-0 min-w-0 grid place-items-center text-sm text-gray-400">
      Custom row panel placeholder {params?.id ? `for ${params.id}` : ""}
    </div>
  );
}
