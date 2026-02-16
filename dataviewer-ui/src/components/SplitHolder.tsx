import { Splitter, SplitterPanel } from "primereact/splitter";

interface SplitHolderProps {
  splitDirection: "horizontal" | "vertical";
  splitVisible: boolean;
  mainView: React.ReactNode;
  auxiliaryView: React.ReactNode;
}

export default function SplitHolder({
  splitDirection,
  splitVisible,
  mainView,
  auxiliaryView,
}: SplitHolderProps) {
  return (
    <>
      {splitVisible ? (
        <Splitter layout={splitDirection} className="h-full bg-transparent">
          <SplitterPanel size={75} minSize={10}>
            {mainView}
          </SplitterPanel>
          <SplitterPanel minSize={10}>{auxiliaryView}</SplitterPanel>
        </Splitter>
      ) : (
        mainView
      )}
    </>
  );
}
