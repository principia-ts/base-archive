export const ANSI_RESET = "\u001B[0m";

export function green(s: string): string {
  return "\u001B[32m" + s + ANSI_RESET;
}

export function red(s: string): string {
  return "\u001B[31m" + s + ANSI_RESET;
}

export function blue(s: string): string {
  return "\u001B[34m" + s + ANSI_RESET;
}

export function cyan(s: string): string {
  return "\u001B[36m" + s + ANSI_RESET;
}

export const tabSize = 2;
