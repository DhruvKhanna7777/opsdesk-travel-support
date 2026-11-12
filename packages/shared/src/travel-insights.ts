export const TRAVEL_THEMES = [
  'REFUND',
  'CANCELLATION',
  'BOOKING_CHANGE',
  'CHECK_IN',
  'BAGGAGE',
  'SUPPLIER_FOLLOW_UP',
];

export type TravelInsights = {
  total: number;
  closed: number;
  backlog: number;
  breached: number;
  repeatBookings: number;
  medianFirstResponseHours: number | null;
  medianResolutionHours: number | null;
  categories: { category: string; count: number }[];
  themes: {
    theme: string;
    count: number;
    examples: { id: string; reference: string; title: string }[];
  }[];
  days: { date: string; count: number }[];
  suppliers: {
    id: string;
    name: string;
    cases: number;
    open: number;
    overdue: number;
  }[];
};
