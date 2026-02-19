import { api, type FacetResponse, type PingResponse } from "@/services/api";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface AppContextType {
  pingResult: PingResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetchPing: () => Promise<void>;
  facetResult: FacetResponse | null;
  isFacetLoading: boolean;
  facetError: Error | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [pingResult, setPingResult] = useState<PingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [facetResult, setFacetResult] = useState<FacetResponse | null>(null);
  const [isFacetLoading, setIsFacetLoading] = useState(true);
  const [facetError, setFacetError] = useState<Error | null>(null);

  const fetchPing = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.ping();
      setPingResult(result);
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
