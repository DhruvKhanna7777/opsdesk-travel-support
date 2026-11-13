import { TICKET_SORTABLE_FIELDS } from "@helpdesk/shared";
import { Select } from "@/components/ui/select";
import { TICKET_SORT_CONTROLS_TEXT } from "@/lib/constants/text/tickets.text";
import type { TicketSortControlsProps } from "./ticket-sort-controls.types";

export function TicketSortControls({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: TicketSortControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="ticket-sort-by" className="text-sm text-text-secondary">
        {TICKET_SORT_CONTROLS_TEXT.SORT_LABEL}
      </label>
      <Select
        id="ticket-sort-by"
        value={sortBy}
        onChange={(event) => onSortByChange(event.target.value as typeof sortBy)}
        className="w-auto"
      >
        {TICKET_SORTABLE_FIELDS.map((field) => (
          <option key={field} value={field}>
            {TICKET_SORT_CONTROLS_TEXT.FIELD_LABELS[field]}
          </option>
        ))}
      </Select>

      <button
        type="button"
        onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
        className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-border-strong bg-surface px-3 py-2 text-sm text-text transition-colors hover:border-text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-secondary"
      >
        <span aria-hidden="true">{sortOrder === "asc" ? "↑" : "↓"}</span>
        {sortOrder === "asc" ? TICKET_SORT_CONTROLS_TEXT.ASC : TICKET_SORT_CONTROLS_TEXT.DESC}
      </button>
    </div>
  );
}
