/**
 * Check if a value is a string
 */
export function isString(u: unknown): u is string {
  return typeof u === "string";
}

/**
 * Check is a string is empty
 */
export function isEmpty(s: string): boolean {
  return s === "";
}

/**
 * Check if a string contains the given substring
 */
export function contains_(s: string, substr: string): boolean {
  return s.includes(substr);
}

/**
 * Check if a string contains the given substring
 */
export function contains(substr: string): (s: string) => boolean {
  return (s) => s.includes(substr);
}

/**
 * Check if a string starts with the given substring
 */
export function startsWith_(s: string, substr: string): boolean {
  return s.startsWith(substr);
}

/**
 * Check if a string starts with the given substring
 */
export function startsWith(substr: string): (s: string) => boolean {
  return (s) => startsWith_(s, substr);
}

/**
 * Check if a string ends with the given substring
 */
export function endsWith_(s: string, substr: string): boolean {
  return s.endsWith(substr);
}

/**
 * Check if a string ends with the given substring
 */
export function endsWith(substr: string): (s: string) => boolean {
  return (s) => endsWith_(s, substr);
}
