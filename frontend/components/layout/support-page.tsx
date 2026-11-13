import type { ReactNode } from "react";
import { Layers3 } from "lucide-react";
import { Skiper40Link } from "@/components/ui/skiper40-link";
import { SupportPageContent } from "./support-page-content";

export function SupportPage({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="support-page">
      <header className="support-header">
        <Skiper40Link
          href="/"
          className="support-brand"
          aria-label="OpsDesk home"
        >
          <Layers3 size={20} aria-hidden="true" /> opsdesk.
        </Skiper40Link>
      </header>
      <main>
        <SupportPageContent
          className={compact ? "support-main support-main-compact" : "support-main"}
        >
          {children}
        </SupportPageContent>
      </main>
    </div>
  );
}
