import * as C from "../../Cause";
import type { Exit } from "../../Exit";
import * as Ex from "../../Exit";
import { join } from "../../Fiber/functions/join";
import { chain_, checkDescriptor, halt, pure } from "../core";
import { raceWith } from "../core-scope";
import type { Effect } from "../Effect";
import { mapErrorCause_ } from "./mapErrorCause";

const mergeInterruption = <E1, A, A1>(a: A) => (x: Exit<E1, A1>): Effect<unknown, E1, A> => {
   switch (x._tag) {
      case "Success":
         return pure(a);
      case "Failure":
         return C.interruptedOnly(x.cause) ? pure(a) : halt(x.cause);
   }
};

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export const race_ = <R, E, A, R1, E1, A1>(
   ef: Effect<R, E, A>,
   that: Effect<R1, E1, A1>
): Effect<R & R1, E | E1, A | A1> =>
   checkDescriptor((d) =>
      raceWith(
         ef,
         that,
         (exit, right) =>
            Ex.foldM_(
               exit,
               (cause) => mapErrorCause_(join(right), (_) => C.both(cause, _)),
               (a) => chain_(right.interruptAs(d.id), mergeInterruption(a))
            ),
         (exit, left) =>
            Ex.foldM_(
               exit,
               (cause) => mapErrorCause_(join(left), (_) => C.both(cause, _)),
               (a) => chain_(left.interruptAs(d.id), mergeInterruption(a))
            )
      )
   );

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export const race = <R1, E1, A1>(that: Effect<R1, E1, A1>) => <R, E, A>(ef: Effect<R, E, A>) => race_(ef, that);
