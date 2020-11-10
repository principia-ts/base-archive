import type { NonEmptyArray } from "../NonEmptyArray";

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

export const isOutOfBound_ = <A>(i: number, as: ReadonlyArray<A>): boolean => i < 0 || i >= as.length;

export const isOutOfBound = (i: number) => <A>(as: ReadonlyArray<A>): boolean => isOutOfBound_(i, as);

export const isEmpty = <A>(as: ReadonlyArray<A>): boolean => as.length === 0;

export const isNonEmpty = <A>(as: ReadonlyArray<A>): as is NonEmptyArray<A> => as.length > 0;