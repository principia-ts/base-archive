import type { IO } from "../core";

import { flatMap_, pure } from "../core";

/**
 * Iterates with the specified effectual function. The moral equivalent of:
 *
 * ```typescript
 * let s = initial;
 *
 * while (cont(s)) {
 *   s = body(s);
 * }
 *
 * return s;
 * ```
 */
export const iterate_ = <R, E, A>(
  initial: A,
  cont: (a: A) => boolean,
  body: (a: A) => IO<R, E, A>
): IO<R, E, A> =>
  cont(initial) ? flatMap_(body(initial), (a) => iterate(a)(cont)(body)) : pure(initial);

/**
 * Iterates with the specified effectual function. The moral equivalent of:
 *
 * ```typescript
 * let s = initial;
 *
 * while (cont(s)) {
 *   s = body(s);
 * }
 *
 * return s;
 * ```
 */
export const iterate = <A>(initial: A) => (cont: (b: A) => boolean) => <R, E>(
  body: (b: A) => IO<R, E, A>
): IO<R, E, A> => iterate_(initial, cont, body);
