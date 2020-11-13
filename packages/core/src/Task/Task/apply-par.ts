import * as C from "../Exit/Cause";
import type { Exit } from "../Exit/model";
import { join } from "../Fiber/combinators/join";
import type { FiberId } from "../Fiber/FiberId";
import type { Fiber } from "../Fiber/model";
import * as T from "./_core";
import { raceWith_, transplant } from "./core-scope";

/*
 * -------------------------------------------
 * Parallel Apply Task
 * -------------------------------------------
 */

/**
 * Parallelly zips this effect with the specified effect using the
 * specified combiner function.
 */
export function mapBothPar_<R, E, A, R2, E2, A2, B>(
   a: T.Task<R, E, A>,
   b: T.Task<R2, E2, A2>,
   f: (a: A, b: A2) => B
): T.Task<R & R2, E | E2, B> {
   const g = (b: A2, a: A) => f(a, b);

   return transplant((graft) =>
      T.descriptorWith((d) =>
         raceWith_(
            graft(a),
            graft(b),
            (ex, fi) => coordinateBothPar<E, E2>()(d.id, f, true, ex, fi),
            (ex, fi) => coordinateBothPar<E, E2>()(d.id, g, false, ex, fi)
         )
      )
   );
}

/**
 * Parallelly zips this effect with the specified effect using the
 * specified combiner function.
 */
export function mapBothPar<A, R1, E1, A1, B>(
   mb: T.Task<R1, E1, A1>,
   f: (a: A, b: A1) => B
): <R, E>(ma: T.Task<R, E, A>) => T.Task<R & R1, E1 | E, B> {
   return (ma) => mapBothPar_(ma, mb, f);
}

function coordinateBothPar<E, E2>() {
   return <B, X, Y>(
      fiberId: FiberId,
      f: (a: X, b: Y) => B,
      leftWinner: boolean,
      winner: Exit<E | E2, X>,
      loser: Fiber<E | E2, Y>
   ) => {
      switch (winner._tag) {
         case "Success": {
            return T.map_(join(loser), (y) => f(winner.value, y));
         }
         case "Failure": {
            return T.chain_(loser.interruptAs(fiberId), (e) => {
               switch (e._tag) {
                  case "Success": {
                     return T.halt(winner.cause);
                  }
                  case "Failure": {
                     return leftWinner ? T.halt(C.both(winner.cause, e.cause)) : T.halt(C.both(e.cause, winner.cause));
                  }
               }
            });
         }
      }
   };
}

export function apPar_<R, E, A, R1, E1, B>(
   fab: T.Task<R, E, (a: A) => B>,
   fa: T.Task<R1, E1, A>
): T.Task<R & R1, E | E1, B> {
   return mapBothPar_(fab, fa, (f, a) => f(a));
}

export function apPar<R, E, A>(
   fa: T.Task<R, E, A>
): <Q, D, B>(fab: T.Task<Q, D, (a: A) => B>) => T.Task<Q & R, E | D, B> {
   return (fab) => apPar_(fab, fa);
}

export function apFirstPar_<R, E, A, R1, E1, B>(fa: T.Task<R, E, A>, fb: T.Task<R1, E1, B>): T.Task<R & R1, E | E1, A> {
   return mapBothPar_(fa, fb, (a, _) => a);
}

export function apFirstPar<R1, E1, B>(
   fb: T.Task<R1, E1, B>
): <R, E, A>(fa: T.Task<R, E, A>) => T.Task<R & R1, E1 | E, A> {
   return (fa) => apFirstPar_(fa, fb);
}

export function apSecondPar_<R, E, A, R1, E1, B>(
   fa: T.Task<R, E, A>,
   fb: T.Task<R1, E1, B>
): T.Task<R & R1, E | E1, B> {
   return mapBothPar_(fa, fb, (_, b) => b);
}

export function apSecondPar<R1, E1, B>(
   fb: T.Task<R1, E1, B>
): <R, E, A>(fa: T.Task<R, E, A>) => T.Task<R & R1, E1 | E, B> {
   return (fa) => apSecondPar_(fa, fb);
}
