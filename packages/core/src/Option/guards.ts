import type { None, Option, Some } from "./model";

/*
 * -------------------------------------------
 * Typeguards
 * -------------------------------------------
 */

export function isNone<A>(fa: Option<A>): fa is None {
  return fa._tag === "None";
}

export function isSome<A>(fa: Option<A>): fa is Some<A> {
  return fa._tag === "Some";
}
