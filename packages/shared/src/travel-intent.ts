export function classifyTravelIntent(text: string): string {
  const complaint = text
    .toLowerCase()
    .replaceAll('’', "'")
    .replace(
      /\b(?:do not|don't)\s+(?:(?:want|need)\s+(?:(?:a|any|to)\s+)?)?(?:refund\w*|cancel\w*)\b/g,
      '',
    );
  if (
    /\b(?:refund\w*|money back|reimburs\w*)\b|\b(?:reverse|return|credit back)\b[^.!?;]{0,45}\b(?:charge|payment|paid)\b/.test(
      complaint,
    )
  )
    return 'REFUND';
  if (
    /\bcancel\w*\b|\b(?:void|withdraw)\b[^.!?;]{0,55}\b(?:booking|reservation|ticket)\b/.test(
      complaint,
    )
  )
    return 'CANCELLATION';
  if (
    /\b(?:reschedul\w*|amend\w*)\b|\b(?:move|change|correct)\b[^.!?;]{0,55}\b(?:booking|reservation|arrival|check[ -]?in|dates?|ticket|name|time)\b/.test(
      complaint,
    ) ||
    /\b(?:move|change)\s+(?:(?:my|our|the|this|return|outbound|inbound)\s+){0,4}(?:flight|trip|seat|train)\b/.test(
      complaint,
    )
  )
    return 'BOOKING_CHANGE';
  if (
    /\b(?:baggage|luggage|suitcases?|carry[ -]?ons?|checked bags?)\b/.test(
      complaint,
    )
  )
    return 'BAGGAGE';
  if (
    /\b(?:check[ -]?in|voucher)\b|\b(?:reception|front desk)\b[^.!?;]{0,70}\b(?:can't find|cannot find|can't locate|cannot locate|can't see|doesn't recognize)\b/.test(
      complaint,
    )
  )
    return 'CHECK_IN';
  return 'OTHER';
}
