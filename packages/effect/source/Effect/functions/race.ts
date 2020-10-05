import * as C from "../../Cause";
import * as Ex from "../../Exit";
import { Exit } from "../../Exit";
import { join } from "../../Fiber/functions/join";
import { _chain, checkDescriptor, halt, pure } from "../core";
import { raceWith } from "../core-scope";
import { Effect } from "../Effect";
import { _mapErrorCause } from "./mapErrorCause";

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
export const _race = <R, E, A, R1, E1, A1>(
   ef: Effect<R, E, A>,
   that: Effect<R1, E1, A1>
): Effect<R & R1, E | E1, A | A1> =>
   checkDescriptor((d) =>
      raceWith(
         ef,
         that,
         (exit, right) =>
            Ex._foldM(
               exit,
               (cause) => _mapErrorCause(join(right), (_) => C.both(cause, _)),
               (a) => _chain(right.interruptAs(d.id), mergeInterruption(a))
            ),
         (exit, left) =>
            Ex._foldM(
               exit,
               (cause) => _mapErrorCause(join(left), (_) => C.both(cause, _)),
               (a) => _chain(left.interruptAs(d.id), mergeInterruption(a))
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
export const race = <R1, E1, A1>(that: Effect<R1, E1, A1>) => <R, E, A>(ef: Effect<R, E, A>) =>
   _race(ef, that);
