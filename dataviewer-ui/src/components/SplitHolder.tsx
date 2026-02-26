import { Splitter, SplitterPanel } from "primereact/splitter";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface SplitHolderProps {
  splitDirection: "horizontal" | "vertical";
  splitVisible: boolean;
  mainView: ReactNode;
  auxiliaryView: ReactNode;
}

export default function SplitHolder({
  splitDirection,
  splitVisible,
  mainView,
  auxiliaryView,
}: SplitHolderProps) {
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const stopResizing = () => {
      setIsResizing(false);
    };

    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
    window.addEventListener("blur", stopResizing);

    return () => {
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
      window.removeEventListener("blur", stopResizing);
    };
  }, [isResizing]);

  return (
    <Splitter
      layout={splitDirection}
      className={`split-holder h-full w-full min-h-0 min-w-0 bg-transparent ${
        splitVisible ? "" : "split-holder--collapsed"
      } ${isResizing ? "split-holder--resizing" : ""}`}
      onPointerDownCapture={(event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest(".p-splitter-gutter")) {
          setIsResizing(true);
        }
      }}
    >
      <SplitterPanel
        size={splitVisible ? 75 : 100}
        minSize={10}
        className="min-h-0 min-w-0 overflow-hidden"
      >
        {mainView}
      </SplitterPanel>
      <SplitterPanel
        size={splitVisible ? 25 : 0}
        minSize={0}
        className="min-h-0 min-w-0 overflow-hidden"
      >
        {auxiliaryView}
      </SplitterPanel>
    </Splitter>
  );
}
