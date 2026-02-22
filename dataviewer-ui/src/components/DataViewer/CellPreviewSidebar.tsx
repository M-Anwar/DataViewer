import { Sidebar } from "primereact/sidebar";
import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type SelectedCellPreview = {
  column: string;
  rowIndex: number;
  rawValue: unknown;
  formattedValue: ReactNode;
};

interface CellPreviewSidebarProps {
  visible: boolean;
  selectedCell: SelectedCellPreview | null;
  onHide: () => void;
}

export function CellPreviewSidebar({
  visible,
  selectedCell,
  onHide,
}: CellPreviewSidebarProps) {
  // Width is tracked in pixels so the drag interaction maps directly to cursor movement.
  const [sidebarWidthPx, setSidebarWidthPx] = useState(408);
  // During drag, we attach global listeners so resizing continues even if the cursor
  // leaves the sidebar handle.
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const handleSidebarResizeStart = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsResizingSidebar(true);
    },
    [],
  );

  useEffect(() => {
    if (!isResizingSidebar) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const nextWidth = window.innerWidth - event.clientX;
      const clampedWidth = Math.min(1200, Math.max(320, nextWidth));
      setSidebarWidthPx(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    // Prevent accidental text selection while dragging and keep cursor feedback consistent.
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar]);

  return (
    <>
      {visible && typeof document !== "undefined"
        ? createPortal(
            // Render the resize handle in document.body so it is independent from the
            // sidebar content container (which may have padding/scroll/overflow rules).
            // This keeps the hit area aligned to the sidebar edge and clickable for
            // the full viewport height.
            <div
              className="fixed top-0 bottom-0 w-3 cursor-ew-resize"
              // The handle straddles the left edge of the right sidebar. The -6 offset
              // centers a 12px hit area on the exact boundary.
              style={{ right: `${sidebarWidthPx - 6}px`, zIndex: 1202 }}
              onMouseDown={handleSidebarResizeStart}
            />,
            document.body,
          )
        : null}
      <Sidebar
        visible={visible}
        position="right"
        style={{ width: `${sidebarWidthPx}px` }}
        onHide={onHide}
        header={
          selectedCell
            ? `Cell Value · ${selectedCell.column} · row ${selectedCell.rowIndex + 1}`
            : "Cell Value"
        }
      >
        <div>
          {selectedCell === null ? (
            <span className="text-muted-foreground">No cell selected.</span>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-sm text-muted-foreground">
                Type: {typeof selectedCell.rawValue}
              </div>
              {selectedCell.formattedValue}
            </div>
          )}
        </div>
      </Sidebar>
    </>
  );
}
