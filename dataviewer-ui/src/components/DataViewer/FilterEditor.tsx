import { useApp } from "@/contexts/AppContext";
import * as api from "@/services/api";
import { AutoComplete } from "primereact/autocomplete";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { useMemo, useState } from "react";

import { InputSwitch } from "primereact/inputswitch";
import FilterChip from "./FilterChip";

interface FilterEditorProps {
  onUpdateFilter: (filter: api.Filter) => void;
  initialColumn?: string | null;
  initialOperator?: api.Operator | null;
  initialValue?: string | (string | null)[] | null;
  initialIsColumnValue?: boolean;
}

const ARRAY_OPERATOR_TYPES: api.Operator[] = ["in", "not in", "between"];

export default function FilterEditor({
  onUpdateFilter,
  initialColumn,
  initialOperator,
  initialValue,
  initialIsColumnValue,
}: FilterEditorProps) {
  const [selectedColumn, setSelectedColumn] = useState<string | null>(
    initialColumn || null,
  );
  const [selectedOperator, setSelectedOperator] = useState<api.Operator | null>(
    initialOperator || null,
  );
  const [filterValue, setFilterValue] = useState<
    string | (string | null)[] | null
  >(initialValue || null);
  const [isColumnValue, setIsColumnValue] = useState(
    initialIsColumnValue || false,
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filteredAutoCompleteOptions, setFilteredAutoCompleteOptions] =
    useState<string[] | undefined>(undefined);

  const { pingResult, facetResult } = useApp();
  const columns = useMemo(() => {
    if (!pingResult) return [];
    return pingResult.dataset_info.full_schema.map((col) => ({
      name: col.name,
      type: col.type,
    }));
  }, [pingResult]);

  const facets: Record<string, api.FacetValue[]> = useMemo(() => {
    if (!facetResult) return {};
    return Object.fromEntries(
      facetResult.facets.map((facet) => [facet.column, facet.values]),
    );
  }, [facetResult]);

  const search = (event: { query: string }) => {
    const query = event.query.trim().toLowerCase();

    // Add facet values if selected column exists in facets
    let facetValues: string[] = [];
    if (selectedColumn && facets[selectedColumn]) {
      facetValues = facets[selectedColumn].map((fv) =>
        fv.value === null ? "null" : fv.value.toString(),
      );

      if (query.length > 0) {
        facetValues = facetValues.filter((value) =>
          value.toLowerCase().includes(query),
        );
      }
    }

    // Search against columns as well
    let columnOptions: string[] = [];
    if (query.length === 0) {
      columnOptions = columns.map((col) => col.name);
    } else {
      columnOptions = columns
        .filter((col) => col.name.toLowerCase().includes(query))
        .map((col) => col.name);
    }

    let combinedOptions = [...new Set([...facetValues, ...columnOptions])];

    setFilteredAutoCompleteOptions(combinedOptions);
  };

  const handleAutoCompleteKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      const inputValue = (event.target as HTMLInputElement).value.trim();

      if (inputValue) {
        const isArrayOperator =
          selectedOperator !== null &&
          ARRAY_OPERATOR_TYPES.includes(selectedOperator);

        if (isArrayOperator && Array.isArray(filterValue)) {
          // Append the current input to the array
          setFilterValue([...filterValue, inputValue]);
          (event.target as HTMLInputElement).value = "";
        }
        if (isArrayOperator && filterValue === null) {
          setFilterValue([inputValue]);
          (event.target as HTMLInputElement).value = "";
        }
      }
    }
  };

  const onApplyButton = () => {
    // Check if column, operator and value are provided
    if (!selectedColumn || !selectedOperator || filterValue === null) {
      setErrorMessage("Please provide column, operator, and value.");
    } else {
      setErrorMessage(null);
      const newFilter: api.Filter = {
        column: selectedColumn,
        operator: selectedOperator,
        value: filterValue,
        is_column: isColumnValue,
      };
      onUpdateFilter(newFilter);
    }
  };

  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="flex flex-row gap-1 items-center">
        <Dropdown
          value={selectedColumn}
          options={columns}
          optionLabel="name"
          optionValue="name"
          onChange={(e) => {
            setSelectedColumn(e.value);
            search({ query: "" });
          }}
          placeholder="Select a column"
          filter
          filterDelay={10}
        />
        <Dropdown
          value={selectedOperator}
          options={api.OPERATOR_OPTIONS}
          onChange={(e) => {
            const newOperator = e.value;
            setSelectedOperator(newOperator);

            // Convert filterValue when switching between array and non-array operators
            if (filterValue !== null) {
              const isArrayOperator =
                ARRAY_OPERATOR_TYPES.includes(newOperator);
              const isCurrentlyArray = Array.isArray(filterValue);

              if (isArrayOperator && !isCurrentlyArray) {
                // Convert single value to array
                setFilterValue([filterValue]);
              } else if (!isArrayOperator && isCurrentlyArray) {
                // Convert array to single value (take first element)
                setFilterValue(filterValue.length > 0 ? filterValue[0] : null);
              }
            }
          }}
          placeholder="Select an operator"
        />

        <AutoComplete
          dropdown
          multiple={
            selectedOperator !== null &&
            ARRAY_OPERATOR_TYPES.includes(selectedOperator)
          }
          value={filterValue}
          suggestions={filteredAutoCompleteOptions}
          completeMethod={search}
          onChange={(e) => {
            const value = e.value;
            if (Array.isArray(value)) {
              setFilterValue(value.filter((v) => v !== null));
            } else {
              setFilterValue(value);
            }
          }}
          className="max-w-lg flex flex-row"
          onKeyDown={handleAutoCompleteKeyDown}
          inputStyle={{
            width: "fit-content",
            minWidth: "150px",
            maxWidth: "300px",
          }}
          placeholder="Filter Value"
        />

        <span className="ml-2 mr-1"> Is Column: </span>
        <InputSwitch
          checked={isColumnValue}
          onChange={(e) => setIsColumnValue(e.value)}
        />
      </div>
      <div className="flex gap-4 items-center flex-wrap">
        <FilterChip
          column={selectedColumn}
          operator={selectedOperator}
          value={filterValue}
          isColumnValue={isColumnValue}
        />
        <Button onClick={onApplyButton}> Apply </Button>
      </div>
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
      )}
    </div>
  );
}
