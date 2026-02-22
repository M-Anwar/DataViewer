import { api, type FacetResponse, type PingResponse } from "@/services/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from "react";

type GlobalConfigState = {
  hidden_columns: string[];
};

type GlobalConfigAction = {
  type: "UPDATE_CONFIG";
  payload: Partial<GlobalConfigState>;
};

const DEFAULT_GLOBAL_CONFIG: GlobalConfigState = {
  hidden_columns: [],
};

const globalConfigReducer = (
  state: GlobalConfigState,
  action: GlobalConfigAction,
): GlobalConfigState => {
  switch (action.type) {
    case "UPDATE_CONFIG": {
      const nextHiddenColumns =
        action.payload.hidden_columns === undefined
          ? state.hidden_columns
          : action.payload.hidden_columns;

      return {
        ...state,
        ...action.payload,
        hidden_columns: nextHiddenColumns,
      };
    }
    default:
      return state;
  }
};

const getHiddenColumnsFromPing = (
  result: PingResponse,
): GlobalConfigState["hidden_columns"] => {
  const hiddenColumns = result.configuration.hidden_columns as
    | GlobalConfigState["hidden_columns"]
    | null
    | undefined;
  return hiddenColumns ?? [];
};

interface AppContextType {
  pingResult: PingResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetchPing: () => Promise<void>;
  facetResult: FacetResponse | null;
  isFacetLoading: boolean;
  facetError: Error | null;
  globalConfig: GlobalConfigState;
  setHiddenColumns: (columns: string[]) => void;
  updateGlobalConfig: (updates: Partial<GlobalConfigState>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [pingResult, setPingResult] = useState<PingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [globalConfig, dispatchGlobalConfig] = useReducer(
    globalConfigReducer,
    DEFAULT_GLOBAL_CONFIG,
  );

  const [facetResult, setFacetResult] = useState<FacetResponse | null>(null);
  const [isFacetLoading, setIsFacetLoading] = useState(true);
  const [facetError, setFacetError] = useState<Error | null>(null);

  const fetchPing = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.ping();
      setPingResult(result);
      dispatchGlobalConfig({
        type: "UPDATE_CONFIG",
        payload: {
          hidden_columns: getHiddenColumnsFromPing(result),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch ping"));
      console.error("Ping error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFacets = async () => {
    try {
      const result = await api.facets();
      setFacetResult(result);
    } catch (err) {
      setFacetError(
        err instanceof Error ? err : new Error("Failed to fetch facets"),
      );
      console.error("Facets error:", err);
    } finally {
      setIsFacetLoading(false);
    }
  };

  useEffect(() => {
    fetchPing();
    fetchFacets();
  }, []);

  const setHiddenColumns = useCallback((columns: string[]) => {
    dispatchGlobalConfig({
      type: "UPDATE_CONFIG",
      payload: {
        hidden_columns: columns,
      },
    });
  }, []);

  const updateGlobalConfig = useCallback(
    (updates: Partial<GlobalConfigState>) => {
      dispatchGlobalConfig({
        type: "UPDATE_CONFIG",
        payload: updates,
      });
    },
    [],
  );

  return (
    <AppContext.Provider
      value={{
        pingResult,
        isLoading,
        error,
        refetchPing: fetchPing,
        facetResult,
        isFacetLoading,
        facetError,
        globalConfig,
        setHiddenColumns,
        updateGlobalConfig,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
