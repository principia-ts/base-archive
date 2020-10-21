import * as C from "../../Cause";
import type { Exit } from "../../Exit/Exit";
import type { Fiber } from "../../Fiber/Fiber";
import type { FiberId } from "../../Fiber/FiberId";
import { join } from "../../Fiber/functions/join";
import * as T from "../core";
import { raceWith, transplant } from "../core-scope";

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 */
export function mapBothPar_<R, E, A, R2, E2, A2, B>(
   a: T.Effect<R, E, A>,
   b: T.Effect<R2, E2, A2>,
   f: (a: A, b: A2) => B
): T.Effect<R & R2, E | E2, B> {
   const g = (b: A2, a: A) => f(a, b);

   return transplant((graft) =>
      T.checkDescriptor((d) =>
         raceWith(
            graft(a),
            graft(b),
            (ex, fi) => coordinateBothPar<E, E2>()(d.id, f, true, ex, fi),
            (ex, fi) => coordinateBothPar<E, E2>()(d.id, g, false, ex, fi)
         )
      )
   );
}

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 */
export const mapBothPar = <A, R1, E1, A1, B>(mb: T.Effect<R1, E1, A1>, f: (a: A, b: A1) => B) => <R, E>(
   ma: T.Effect<R, E, A>
) => mapBothPar_(ma, mb, f);

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
