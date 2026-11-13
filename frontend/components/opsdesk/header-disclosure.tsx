"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function HeaderDisclosure({
  className,
  trigger,
  triggerClassName,
  children,
}: {
  className: string;
  trigger: ReactNode;
  triggerClassName: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function dismiss(event: Event) {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
    };
  }, [open]);

  return (
    <div
      className={className}
      ref={root}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <button
        type="button"
        className={triggerClassName}
        ref={button}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        {trigger}
      </button>
      <div
        id={panelId}
        className="od-header-disclosure-panel"
        hidden={!open}
        onClickCapture={(event) => {
          if (event.target instanceof Element && event.target.closest("button, a"))
            close();
        }}
      >
        {children}
      </div>
    </div>
  );
}
