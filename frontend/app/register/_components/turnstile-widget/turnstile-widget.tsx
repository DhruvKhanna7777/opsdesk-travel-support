"use client";

import Script from "next/script";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type {
  TurnstileWidgetHandle,
  TurnstileWidgetProps,
} from "./turnstile-widget.types";
import { TURNSTILE_SCRIPT_SRC, TURNSTILE_SITE_KEY } from "@/lib/constants/turnstile.constants";

/**
 * Renders Cloudflare's Turnstile challenge widget on the register form
 * (Step 7.2 — see auth.controller.ts's TurnstileGuard for the matching
 * backend verification). Not promoted to components/ui/ yet, per the
 * project's promotion rule: this is register's only consumer so far.
 *
 * Uses next/script's `onReady` (not `onLoad`) — onLoad only ever fires
 * once per page load, so it wouldn't fire again if the visitor navigates
 * back to /register client-side after the script already loaded once;
 * onReady fires after load AND on every mount, which is what a
 * per-instance widget actually needs.
 */
export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  TurnstileWidgetProps
>(function TurnstileWidget({ onVerify, onExpire, onError }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      onError?.();
      return;
    }
    if (!scriptReady || !containerRef.current || widgetIdRef.current) {
      return;
    }
    if (!window.turnstile) {
      onError?.();
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "light",
      callback: onVerify,
      "expired-callback": () => onExpire?.(),
      "error-callback": () => onError?.(),
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // Render once when the script becomes ready; onVerify/onExpire/onError
    // are handed to Turnstile itself at render time, not re-subscribed on
    // every change — re-running this effect on their identity would tear
    // down and rebuild the widget on every RegisterForm re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }));

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <>
      <Script
        src={TURNSTILE_SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => onError?.()}
      />
      <div ref={containerRef} />
    </>
  );
});
