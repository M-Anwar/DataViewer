import type { Filter } from "@/services/api";
import { Badge } from "primereact/badge";
import { Button } from "primereact/button";
import { OverlayPanel } from "primereact/overlaypanel";
import { SplitButton } from "primereact/splitbutton";
import { useRef, useState } from "react";
import FilterChip from "./DataViewer/FilterChip";

type Bookmark = {
  searchMode: "Quick Filters" | "SQL Editor";
  filters: Filter[];
  sql_query: string | null;
  Description: string;
};

interface BookmarksProps {
  filters: Filter[];
  sqlQuery?: string;
  searchMode: "Quick Filters" | "SQL Editor";
  onApplySearchMode?: (mode: "Quick Filters" | "SQL Editor") => void;
  onApplyQuickFilters?: (filters: Filter[]) => void;
  onApplySqlQuery?: (sqlQuery: string) => void;
}

export function Bookmarks({
  filters,
  sqlQuery,
  searchMode,
  onApplySearchMode,
  onApplyQuickFilters,
  onApplySqlQuery,
}: BookmarksProps) {
  const bookmarksOverlay: React.RefObject<OverlayPanel | null> = useRef(null);
  const bookmarksFileInputRef = useRef<HTMLInputElement | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const saveBookmarksToJson = () => {
    const bookmarkData = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([bookmarkData], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = downloadUrl;
    downloadAnchor.download = "bookmarks.json";
    downloadAnchor.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const loadBookmarksFromJson = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    try {
      const fileText = await selectedFile.text();
      const parsed = JSON.parse(fileText) as unknown;

      if (!Array.isArray(parsed)) {
        return;
      }

      const loadedBookmarks = parsed
        .filter(
          (item): item is Partial<Bookmark> =>
            typeof item === "object" && item !== null,
        )
        .map((item) => {
          const mode =
            item.searchMode === "Quick Filters" ||
            item.searchMode === "SQL Editor"
              ? item.searchMode
              : "Quick Filters";
          const itemFilters = Array.isArray(item.filters)
            ? (item.filters as Filter[])
            : [];
          const itemSql =
            typeof item.sql_query === "string" ? item.sql_query : null;
          const itemDescription =
            typeof item.Description === "string"
              ? item.Description
              : "Placeholder bookmark description";

          return {
            searchMode: mode,
            filters: mode === "SQL Editor" ? [] : itemFilters,
            sql_query: mode === "SQL Editor" ? (itemSql ?? "") : null,
            Description: itemDescription,
          } as Bookmark;
        });

      setBookmarks(loadedBookmarks);
    } catch {
      return;
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="relative">
      {bookmarks.length > 0 && (
        <Badge
          value={bookmarks.length.toString()}
          className="absolute -top-1 -left-1 z-10"
        />
      )}
      <input
        ref={bookmarksFileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={loadBookmarksFromJson}
      />
      <SplitButton
        className="no-focus"
        icon="pi pi-bookmark"
        model={[]}
        outlined
        onClick={() => {
          const copiedFilters = filters.map((filter) => ({
            ...filter,
            value: Array.isArray(filter.value)
              ? [...filter.value]
              : filter.value,
          }));

          const nextBookmark: Bookmark = {
            searchMode,
            filters: searchMode === "SQL Editor" ? [] : copiedFilters,
            sql_query: searchMode === "SQL Editor" ? (sqlQuery ?? "") : null,
            Description: "Placeholder bookmark description",
          };

          setBookmarks((prevBookmarks) => [...prevBookmarks, nextBookmark]);
        }}
        menuButtonProps={{
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.stopPropagation();
            bookmarksOverlay.current?.toggle(event);
          },
        }}
      />
      <OverlayPanel
        ref={bookmarksOverlay}
        className="w-[32rem] h-[40rem]"
        pt={{
          content: {
            className: "h-full min-h-0 overflow-hidden p-3",
          },
        }}
      >
        <div className="h-full min-h-0 flex flex-col gap-3">
          <div className="flex items-center justify-end gap-2">
            <Button
              label="Load bookmarks"
              outlined
              size="small"
              onClick={() => bookmarksFileInputRef.current?.click()}
            />
            <Button
              label="Save bookmarks"
              outlined
              size="small"
              onClick={saveBookmarksToJson}
            />
          </div>
          <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-2">
            {bookmarks.length === 0 ? (
              <div className="text-sm text-gray-400">No bookmarks yet.</div>
            ) : (
              bookmarks.map((bookmark, index) => {
                const hasFilters = bookmark.filters.length > 0;
                const hasSqlQuery =
                  (bookmark.sql_query ?? "").trim().length > 0;

                return (
                  <div
                    key={`${bookmark.searchMode}-${index}`}
                    role="button"
                    tabIndex={0}
                    className="relative w-full text-left rounded-lg cursor-pointer border border-gray-700 bg-gray-900 p-3 hover:border-gray-500"
                    onClick={() => {
                      onApplySearchMode?.(bookmark.searchMode);

                      if (bookmark.searchMode === "Quick Filters") {
                        const copiedFilters = bookmark.filters.map(
                          (filter) => ({
                            ...filter,
                            value: Array.isArray(filter.value)
                              ? [...filter.value]
                              : filter.value,
                          }),
                        );
                        onApplyQuickFilters?.(copiedFilters);
                        return;
                      }

                      onApplySqlQuery?.(bookmark.sql_query ?? "");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onApplySearchMode?.(bookmark.searchMode);

                        if (bookmark.searchMode === "Quick Filters") {
                          const copiedFilters = bookmark.filters.map(
                            (filter) => ({
                              ...filter,
                              value: Array.isArray(filter.value)
                                ? [...filter.value]
                                : filter.value,
                            }),
                          );
                          onApplyQuickFilters?.(copiedFilters);
                          return;
                        }

                        onApplySqlQuery?.(bookmark.sql_query ?? "");
                      }
                    }}
                  >
                    <Button
                      icon="pi pi-times"
                      rounded
                      text
                      size="small"
                      severity="danger"
                      aria-label="Remove bookmark"
                      className="absolute top-3 right-3 h-6 w-6"
                      onClick={(event) => {
                        event.stopPropagation();
                        setBookmarks((prevBookmarks) =>
                          prevBookmarks.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        );
                      }}
                    />
                    <div className="pr-6 text-xs text-gray-400">
                      {bookmark.searchMode}
                    </div>
                    <div className="mt-1 text-sm text-gray-100">
                      {bookmark.Description || "No description"}
                    </div>
                    {hasFilters && (
                      <div className="mt-2 flex flex-col gap-2">
                        {bookmark.filters.map((filter, filterIndex) => (
                          <FilterChip
                            key={`${bookmark.searchMode}-${index}-filter-${filterIndex}`}
                            column={filter.column}
                            operator={filter.operator}
                            value={filter.value}
                            isColumnValue={filter.is_column}
                            editable={false}
                            removable={false}
                          />
                        ))}
                      </div>
                    )}
                    {hasSqlQuery && (
                      <div className="mt-1 text-xs text-gray-300 break-words">
                        SQL: {bookmark.sql_query}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </OverlayPanel>
    </div>
  );
}
