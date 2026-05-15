export const MIN_RESOLUTION_REASON_LENGTH = 8;

export const hasValidResolutionReason = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length >= MIN_RESOLUTION_REASON_LENGTH;

export const toDateOnly = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
