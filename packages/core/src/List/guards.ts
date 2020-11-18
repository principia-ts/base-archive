import type { List } from "./model";

/**
 * Returns `true` if the given list is empty and `false` otherwise.
 */
export function isEmpty(l: List<any>): boolean {
  return l.length === 0;
}

/**
 * Returns `true` if the given argument is a list and `false`
 * otherwise.
 *
 * @complexity O(1)
 */
export function isList<A>(l: any): l is List<A> {
  return typeof l === "object" && Array.isArray(l.suffix);
}
