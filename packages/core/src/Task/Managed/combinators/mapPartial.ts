import { identity } from "@principia/prelude";

import { fail, partial_ } from "../constructors";
import { foldM_ } from "../fold";
import type { Managed } from "../model";

/**
 * Returns a Managed whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export const mapPartialWith_ = <R, E, A, E1, B>(
   ma: Managed<R, E, A>,
   f: (a: A) => B,
   onThrow: (error: unknown) => E1
): Managed<R, E | E1, B> => foldM_(ma, fail, (a) => partial_(() => f(a), onThrow));

/**
 * Returns a Managed whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export const mapPartialWith = <A, E1, B>(f: (a: A) => B, onThrow: (error: unknown) => E1) => <R, E>(
   ma: Managed<R, E, A>
): Managed<R, E | E1, B> => mapPartialWith_(ma, f, onThrow);

/**
 * Returns a Managed whose success is mapped by the specified side effecting
 * `f` function.
 */
export const mapPartial_ = <R, E, A, B>(ma: Managed<R, E, A>, f: (a: A) => B): Managed<R, unknown, B> =>
   mapPartialWith_(ma, f, identity);

/**
 * Returns a Managed whose success is mapped by the specified side effecting
 * `f` function.
 */
export const mapPartial = <A, B>(f: (a: A) => B) => <R, E>(ma: Managed<R, E, A>): Managed<R, unknown, B> =>
   mapPartial_(ma, f);
