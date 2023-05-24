export function isInteger(value: unknown): boolean {
  return (
    typeof value === "number" && isFinite(value) && Math.floor(value) === value
  );
}

export function validateInputAsPort(value: unknown): string {
  if (!isInteger(value)) {
    return "Invalid arguments: `port`, `lower-port-limit` and `upper-port-limit` must be integers";
  }

  const intValue = value as number;
  if (intValue < 1024 || intValue > 65_535) {
    return "Invalid arguments: `port`, `lower-port-limit` and `upper-port-limit` must be in the range [1024, 65536)";
  }

  return "";
}
