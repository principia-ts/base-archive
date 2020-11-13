import type { NonEmptyArray } from "../NonEmptyArray";

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

export function isOutOfBound_<A>(i: number, as: ReadonlyArray<A>): boolean {
   return i < 0 || i >= as.length;
}

export function isOutOfBound(i: number): <A>(as: ReadonlyArray<A>) => boolean {
   return (as) => isOutOfBound_(i, as);
}

export function isEmpty<A>(as: ReadonlyArray<A>): boolean {
   return as.length === 0;
}

export function isNonEmpty<A>(as: ReadonlyArray<A>): as is NonEmptyArray<A> {
   return as.length > 0;
}
