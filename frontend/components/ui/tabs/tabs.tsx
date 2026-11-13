import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { TabsProps } from "./tabs.types";

/**
 * Presentational, control-agnostic tablist — the caller owns which panel is
 * shown (see app/account/_components/account-view) and how `activeTab` is
 * persisted (a URL search param, in the account page's case, so a tab is
 * linkable/refreshable). This component only renders the tab buttons and
 * handles roving-tabindex keyboard navigation between them.
 *
 * Active tab uses the app's existing "active" accent (amber) — the same
 * token Badge already uses for in-progress/active states — rather than
 * reaching for a new color.
 */
export function Tabs({ tabs, activeTab, onChange, className, label }: TabsProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusAndSelect = (id: string) => {
    onChange(id);
    tabRefs.current[id]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      focusAndSelect(tabs[nextIndex].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex flex-wrap gap-1 border-b border-border", className)}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative min-h-11 px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer sm:px-4",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-active",
              isActive
                ? "text-text"
                : "text-text-secondary hover:text-text",
            )}
          >
            {tab.label}
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent-active"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
