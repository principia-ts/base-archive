import { chain_, map, pure, unit } from "../_core";
import { pipe } from "../../../Function";
import type { Task } from "../model";

/**
 * Loops with the specified effectual function, collecting the results into a
 * list. The moral equivalent of:
 *
 * ```typescript
 * let s  = initial
 * let as = [] as readonly A[]
 *
 * while (cont(s)) {
 *   as = [body(s), ...as]
 *   s  = inc(s)
 * }
 *
 * A.reverse(as)
 * ```
 */
export const loop = <B>(initial: B) => (cont: (a: B) => boolean, inc: (b: B) => B) => <R, E, A>(
   body: (b: B) => Task<R, E, A>
): Task<R, E, ReadonlyArray<A>> =>
   cont(initial)
      ? chain_(body(initial), (a) =>
           pipe(
              loop(inc(initial))(cont, inc)(body),
              map((as) => [a, ...as])
           )
        )
      : pure([]);

/**
 * Loops with the specified effectual function purely for its effects. The
 * moral equivalent of:
 *
 * ```
 * var s = initial
 *
 * while (cont(s)) {
 *   body(s)
 *   s = inc(s)
 * }
 * ```
 */
export const loopUnit = <A>(initial: A) => (cont: (a: A) => boolean, inc: (a: A) => A) => <R, E>(
   body: (a: A) => Task<R, E, any>
): Task<R, E, void> => (cont(initial) ? chain_(body(initial), () => loop(inc(initial))(cont, inc)(body)) : unit());
