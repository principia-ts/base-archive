import type { Cause } from "../../Cause";
import { unit } from "../core";
import type { Effect } from "../model";
import { onExit_ } from "./onExit";

export const onError_ = <R, E, A, R2, E2>(
   ma: Effect<R, E, A>,
   cleanup: (exit: Cause<E>) => Effect<R2, E2, any>
): Effect<R & R2, E | E2, A> =>
   onExit_(ma, (e) => {
      switch (e._tag) {
         case "Failure": {
            return cleanup(e.cause);
         }
         case "Success": {
            return unit;
         }
      }
   });

export const onError = <E, R2, E2>(cleanup: (exit: Cause<E>) => Effect<R2, E2, any>) => <R, A>(ma: Effect<R, E, A>) =>
   onError_(ma, cleanup);
