"use client";

import { useEffect, useState } from "react";
import type { TravelQueuePage } from "@helpdesk/shared";
import type { Ticket } from "@/lib/opsdesk-types";
type QueueRows = TravelQueuePage & {
  items: Omit<
    Ticket,
    "description" | "messages" | "events" | "relatedIds" | "summary"
  >[];
};
import { request } from "./ui";

export function useTravelQueue(
  userId: string | undefined,
  enabled: boolean,
  filters: Record<string, string>,
  refreshKey: string | undefined,
) {
  const filterKey = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value && value !== "ALL"),
  ).toString();
  const key = userId ? `${userId}:${filterKey}` : "";
  const [navigation, setNavigation] = useState({ key: "", page: 1, attempt: 0 });
  const page = navigation.key === key ? navigation.page : 1;
  const query = `${filterKey}&page=${page}`;
  const resultKey = `${key}:${page}:${navigation.attempt}`;
  const [result, setResult] = useState<{
    key: string;
    scope: string;
    data?: QueueRows;
    error?: string;
  }>();

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void request(`queue?${query}`)
        .then((data: QueueRows) => {
          if (!cancelled) setResult({ key: resultKey, scope: key, data });
        })
        .catch((cause: unknown) => {
          if (!cancelled)
            setResult((previous) => ({
              key: resultKey,
              scope: key,
              data: previous?.scope === key ? previous.data : undefined,
              error:
                cause instanceof Error
                  ? cause.message
                  : "Could not load the inbox.",
            }));
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, userId, key, query, resultKey, refreshKey]);

  return {
    filters: filterKey,
    data: result?.scope === key ? result.data : undefined,
    loading: enabled && Boolean(userId) && result?.key !== resultKey,
    error: result?.key === resultKey ? result.error : undefined,
    goToPage: (next: number) =>
      setNavigation((current) => ({
        key,
        page: next,
        attempt: current.attempt + 1,
      })),
  };
}
