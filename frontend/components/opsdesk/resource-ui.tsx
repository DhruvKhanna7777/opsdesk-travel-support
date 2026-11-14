import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Composes ReUI's Empty pattern using the OpsDesk theme.
export function EmptyState({ icon: Icon, title, children, action, panel }: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  panel?: boolean;
}) {
  return (
    <div className={panel ? "od-empty od-panel" : "od-empty"} data-motion-panel>
      <span className="od-empty-icon"><Icon size={24} aria-hidden /></span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

// ReUI-style grouped pagination, with labels specific to the current resource.
export function Pagination({ previous, next, atStart, atEnd, pending, onPrevious, onNext, children }: {
  previous: string;
  next: string;
  atStart: boolean;
  atEnd: boolean;
  pending?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  children: ReactNode;
}) {
  return (
    <div className="od-page-controls">
      <button type="button" className="od-secondary" disabled={atStart} aria-disabled={pending || undefined} onClick={() => { if (!pending) onPrevious(); }}>
        <ChevronLeft size={16} aria-hidden />{previous}
      </button>
      <span aria-live="polite">{children}</span>
      <button type="button" className="od-secondary" disabled={atEnd} aria-disabled={pending || undefined} onClick={() => { if (!pending) onNext(); }}>
        {next}<ChevronRight size={16} aria-hidden />
      </button>
    </div>
  );
}

export function LoadingRows({ label }: { label: string }) {
  return (
    <div className="od-loading-rows" role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        <span /><span /><span />
      </div>
    </div>
  );
}
