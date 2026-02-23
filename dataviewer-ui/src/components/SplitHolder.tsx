import { Splitter, SplitterPanel } from "primereact/splitter";
import type { ReactNode } from "react";

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
  return (
    <Splitter
      layout={splitDirection}
      className={`split-holder h-full w-full min-h-0 min-w-0 bg-transparent ${
        splitVisible ? "" : "split-holder--collapsed"
      }`}
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
