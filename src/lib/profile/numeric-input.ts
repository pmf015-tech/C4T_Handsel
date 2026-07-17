export function decimalInputOrNull(value: string): number | null {
  return value.trim() ? Number(value) : null;
}
