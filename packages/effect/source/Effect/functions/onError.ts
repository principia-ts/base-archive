import type { Cause } from "../../Cause";
import { unit } from "../core";
import type { Effect } from "../Effect";
import { _onExit } from "./onExit";

export function onError<E, A, R2, E2>(cleanup: (exit: Cause<E>) => Effect<R2, E2, any>) {
   return <R>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
      _onExit(self, (e) => {
         switch (e._tag) {
            case "Failure": {
               return cleanup(e.cause);
            }
            case "Success": {
               return unit;
            }
         }
      });
}
