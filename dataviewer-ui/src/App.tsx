import { useEffect, useState } from "react";
import SplitHolder from "./components/SplitHolder";
import DataViewer from "./DataViewer";
import { api, type PingResponse } from "./services/api";

function App() {
  const [dockDirection, setDockDirection] = useState<"vertical" | "horizontal">(
    "vertical",
  );
  const [dockVisible, setDockVisible] = useState(false);
  const [pingResult, setPingResult] = useState<PingResponse | null>(null);

  useEffect(() => {
    api.ping().then(setPingResult).catch(console.error);
  }, []);

  return (
    <div className="fixed h-screen w-screen">
      <SplitHolder
        splitDirection={dockDirection}
        splitVisible={dockVisible}
        mainView={<DataViewer pingResult={pingResult}/>}
        auxiliaryView={
          <div className="h-full grid place-items-center text-center">
            <h1>Hello World</h1>
          </div>
        }
      />
    </div>
  );
}

export default App;
