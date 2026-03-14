import {
  api,
  type PluginSettingValue,
  type PluginSettingsResponse,
} from "@/services/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type PluginSettingsSchema = PluginSettingsResponse | null;
type PluginSettings = Record<string, PluginSettingValue>;

interface PluginContextType {
  pluginSettingsSchema: PluginSettingsSchema;
  pluginSettings: PluginSettings;
  isLoading: boolean;
  error: Error | null;
  refetchPluginSettings: () => Promise<void>;
  setPluginSettingValue: (key: string, value: PluginSettingValue) => void;
  updatePluginSettingsValues: (
    updates: Record<string, PluginSettingValue>,
  ) => void;
  resetPluginSettingsValues: () => void;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

const toPluginSettingsValues = (
  schema: PluginSettingsSchema,
): PluginSettings => {
  return Object.fromEntries(
    (schema?.settings ?? []).map((setting) => [setting.name, setting.value]),
  );
};

export function PluginProvider({ children }: { children: ReactNode }) {
  const [pluginSettingsSchema, setPluginSettingsSchema] =
    useState<PluginSettingsSchema>(null);
  const [pluginSettings, setPluginSettings] = useState<PluginSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPluginSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.getPluginSettingsSchema();
      setPluginSettingsSchema(result);
      setPluginSettings(toPluginSettingsValues(result));
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch plugin settings"),
      );
      console.error("Plugin settings error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setPluginSettingValue = useCallback(
    (key: string, value: PluginSettingValue) => {
      setPluginSettings((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const updatePluginSettingsValues = useCallback(
    (updates: Record<string, PluginSettingValue>) => {
      setPluginSettings((current) => ({
        ...current,
        ...updates,
      }));
    },
    [],
  );

  const resetPluginSettingsValues = useCallback(() => {
    setPluginSettings(toPluginSettingsValues(pluginSettingsSchema));
  }, [pluginSettingsSchema]);

  useEffect(() => {
    void fetchPluginSettings();
  }, [fetchPluginSettings]);

  return (
    <PluginContext.Provider
      value={{
        pluginSettingsSchema,
        pluginSettings,
        isLoading,
        error,
        refetchPluginSettings: fetchPluginSettings,
        setPluginSettingValue,
        updatePluginSettingsValues,
        resetPluginSettingsValues,
      }}
    >
      {children}
    </PluginContext.Provider>
  );
}

export function usePlugin() {
  const context = useContext(PluginContext);
  if (context === undefined) {
    throw new Error("usePlugin must be used within a PluginProvider");
  }
  return context;
}
