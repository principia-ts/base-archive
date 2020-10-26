import { chain_, pure } from "../core";
import type { Task } from "../model";

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
export const iterate_ = <R, E, A>(initial: A, cont: (a: A) => boolean, body: (a: A) => Task<R, E, A>): Task<R, E, A> =>
   cont(initial) ? chain_(body(initial), (a) => iterate(a)(cont)(body)) : pure(initial);

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
   body: (b: A) => Task<R, E, A>
): Task<R, E, A> => iterate_(initial, cont, body);
