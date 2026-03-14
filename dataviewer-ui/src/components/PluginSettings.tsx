import { usePlugin } from "@/contexts/PluginContext";
import type { PluginSettingValue } from "@/services/api";
import { Button } from "primereact/button";
import { Chips, type ChipsChangeEvent } from "primereact/chips";
import { InputText } from "primereact/inputtext";
import type { KeyFilterType } from "primereact/keyfilter";
import { useCallback, useEffect, useMemo, useState } from "react";

type TextDraftMap = Record<string, string>;

const toInputTextValue = (value: PluginSettingValue | undefined): string => {
  if (value === undefined || Array.isArray(value)) {
    return "";
  }

  return String(value);
};

const getKeyFilter = (typeText: string): KeyFilterType | undefined => {
  switch (typeText) {
    case "int":
      return "int";
    case "float":
      return "num";
    case "bool":
      return "alpha";
    default:
      return undefined;
  }
};

const parseTextValue = (
  typeText: string,
  text: string,
): PluginSettingValue | null => {
  const trimmed = text.trim();

  if (typeText === "int") {
    if (!/^-?\d+$/.test(trimmed)) {
      return null;
    }

    return Number.parseInt(trimmed, 10);
  }

  if (typeText === "float") {
    if (!/^-?\d*(\.\d+)?$/.test(trimmed) || trimmed === "" || trimmed === "-") {
      return null;
    }

    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeText === "bool") {
    if (trimmed.toLowerCase() === "true") {
      return true;
    }

    if (trimmed.toLowerCase() === "false") {
      return false;
    }

    return null;
  }

  return text;
};

export default function PluginSettings() {
  const {
    pluginSettingsSchema,
    pluginSettings,
    isLoading,
    error,
    setPluginSettingValue,
    resetPluginSettingsValues,
    refetchPluginSettings,
  } = usePlugin();

  const [textDrafts, setTextDrafts] = useState<TextDraftMap>({});
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>(
    {},
  );

  const settings = pluginSettingsSchema?.settings ?? [];

  const renderedSettings = useMemo(
    () =>
      settings.map((setting) => ({
        ...setting,
        currentValue: pluginSettings[setting.name] ?? setting.value,
      })),
    [pluginSettings, settings],
  );

  useEffect(() => {
    setTextDrafts({});
    setInvalidFields({});
  }, [pluginSettingsSchema]);

  const setDraft = useCallback((key: string, value: string) => {
    setTextDrafts((current) => ({
      ...current,
      [key]: value,
    }));
  }, []);

  const commitTextValue = useCallback(
    (key: string, typeText: string, fallbackValue: PluginSettingValue) => {
      const currentDraft = textDrafts[key];
      if (currentDraft === undefined) {
        return;
      }

      const parsedValue = parseTextValue(typeText, currentDraft);

      if (parsedValue === null) {
        setInvalidFields((current) => ({
          ...current,
          [key]: true,
        }));
        setDraft(key, toInputTextValue(fallbackValue));
        return;
      }

      setInvalidFields((current) => ({
        ...current,
        [key]: false,
      }));
      setPluginSettingValue(key, parsedValue);
    },
    [setDraft, setPluginSettingValue, textDrafts],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Plugin: {pluginSettingsSchema?.plugin_name ?? "-"} Settings
        </h3>
        <Button
          label="Reset"
          severity="secondary"
          text
          onClick={resetPluginSettingsValues}
          disabled={isLoading || renderedSettings.length === 0}
        />
      </div>

      {isLoading && (
        <div className="text-sm text-color-secondary">
          Loading plugin settings...
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col gap-2">
          <div className="text-sm text-red-400">{error.message}</div>
          <Button
            label="Retry"
            icon="pi pi-refresh"
            severity="secondary"
            text
            onClick={() => {
              void refetchPluginSettings();
            }}
          />
        </div>
      )}

      {!isLoading && !error && renderedSettings.length === 0 && (
        <div className="text-sm text-color-secondary">
          No plugin settings available.
        </div>
      )}

      {!isLoading &&
        !error &&
        renderedSettings.map((setting) => {
          const key = setting.name;
          const currentValue = setting.currentValue;
          const isListSetting =
            setting.type === "list" || Array.isArray(currentValue);

          if (isListSetting) {
            const chipValues = Array.isArray(currentValue)
              ? currentValue.map((item) => String(item))
              : [];

            return (
              <div key={key} className="flex flex-col gap-1">
                <label
                  htmlFor={`plugin-setting-${key}`}
                  className="text-sm font-medium"
                >
                  {key}
                  <span className="ml-2 text-xs text-color-secondary">
                    (list)
                  </span>
                </label>
                <Chips
                  id={`plugin-setting-${key}`}
                  value={chipValues}
                  onChange={(event: ChipsChangeEvent) => {
                    setPluginSettingValue(key, (event.value ?? []) as string[]);
                  }}
                  separator=","
                  allowDuplicate={false}
                  placeholder="Add value and press Enter"
                  className="w-full plugin-settings-chips"
                />
              </div>
            );
          }

          const inputValue = textDrafts[key] ?? toInputTextValue(currentValue);

          return (
            <div key={key} className="flex flex-col gap-1">
              <label
                htmlFor={`plugin-setting-${key}`}
                className="text-sm font-medium"
              >
                {key}
                <span className="ml-2 text-xs text-color-secondary">
                  ({setting.type})
                </span>
              </label>
              <InputText
                id={`plugin-setting-${key}`}
                value={inputValue}
                keyfilter={getKeyFilter(setting.type)}
                className={`w-full ${invalidFields[key] ? "p-invalid" : ""}`}
                onChange={(event) => {
                  setInvalidFields((current) => ({
                    ...current,
                    [key]: false,
                  }));
                  setDraft(key, event.target.value);
                }}
                onBlur={() => {
                  commitTextValue(key, setting.type, currentValue);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitTextValue(key, setting.type, currentValue);
                  }
                }}
                placeholder={
                  setting.type === "bool" ? "Enter true or false" : undefined
                }
              />
            </div>
          );
        })}
    </div>
  );
}
