export const STAFF = ['AGENT', 'MANAGER'];
export const EM_ALERT_KIND = 'EM_ESCALATED';
export const CATEGORIES = [
  'REFUND',
  'CANCELLATION',
  'BOOKING_CHANGE',
  'CHECK_IN',
  'BAGGAGE',
  'OTHER',
];
export const STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_SUPPLIER',
  'WAITING_CUSTOMER',
  'RESOLVED',
  'CLOSED',
];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const active = (status: string) =>
  !['RESOLVED', 'CLOSED'].includes(status);
export { classifyTravelIntent as classify } from '@helpdesk/shared';
export const RESPONSE_WINDOW_MS = 24 * 3600000;
export const CHECK_IN_HIGH_HOURS = 24;

export function responseDeadlineFor(now: Date, hours = 24) {
  return new Date(now.getTime() + hours * 3600000);
}

export function effectiveDeadline(
  category: string,
  responseDeadline: Date,
  booking: {
    checkInAt: Date;
    departureAt: Date | null;
    cancellationCutoffAt: Date | null;
  } | null,
  cycleStartedAt: Date,
) {
  if (!booking || category === 'REFUND') return responseDeadline;
  const travelDates = [booking.checkInAt, booking.departureAt];
  if (category === 'CANCELLATION')
    travelDates.push(booking.cancellationCutoffAt);
  return travelDates.reduce<Date>(
    (earliest, date) =>
      date && date >= cycleStartedAt && date < earliest ? date : earliest,
    responseDeadline,
  );
}
export function urgency(
  category: string,
  deadline: Date,
  checkInAt: Date | undefined,
  now: Date,
  responseDeadline?: Date | null,
  cancellationCutoffAt?: Date | null,
) {
  if (deadline <= now)
    return {
      priority: 'URGENT',
      reason:
        responseDeadline && deadline < responseDeadline
          ? 'Travel deadline breached'
          : 'Response deadline breached',
    };
  const cutoffControlsDeadline =
    category === 'CANCELLATION' &&
    cancellationCutoffAt?.getTime() === deadline.getTime();
  const upcomingTravelDate = cutoffControlsDeadline
    ? cancellationCutoffAt
    : checkInAt;
  const label = cutoffControlsDeadline ? 'Cancellation cutoff' : 'Check-in';
  if (category !== 'REFUND' && upcomingTravelDate && upcomingTravelDate > now) {
    const hours = (+upcomingTravelDate - +now) / 3600000;
    if (hours <= 6)
      return { priority: 'URGENT', reason: `${label} is within 6 hours` };
    if (hours <= CHECK_IN_HIGH_HOURS)
      return { priority: 'HIGH', reason: `${label} is within 24 hours` };
  }
  return null;
}
export function chooseAgent<
  T extends {
    userId: string;
    region: string | null;
    available: boolean;
    status?: string;
    specialties?: string[];
    maxActiveCases?: number | null;
  },
>(
  agents: T[],
  region: string,
  loads: Record<string, number>,
  category?: string,
): T | undefined {
  const rank = (agent: T) =>
    category && agent.specialties?.includes(category)
      ? 0
      : !category || !agent.specialties?.length
        ? 1
        : 2;
  return agents
    .filter(
      (a) =>
        a.available &&
        (a.status === undefined || a.status === 'ACTIVE') &&
        (a.region === region || a.region === 'GLOBAL') &&
        (a.maxActiveCases == null ||
          (loads[a.userId] ?? 0) < a.maxActiveCases) &&
        rank(a) < 2,
    )
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (loads[a.userId] || 0) - (loads[b.userId] || 0) ||
        a.userId.localeCompare(b.userId),
    )[0];
}
