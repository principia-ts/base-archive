import { pipe } from "../../Function";
import type { RuntimeFiber } from "../Fiber";
import * as T from "../Task/_core";
import type { Atomic } from "../XRef";
import * as R from "../XRef/atomic";
import { _continue, Supervisor } from "./model";

/**
 * Creates a new supervisor that tracks children in a set.
 */
export const track = T.total(() => {
   const set = new Set<RuntimeFiber<any, any>>();

   return new Supervisor<RuntimeFiber<any, any>[]>(
      T.total(() => Array.from(set)),
      (_, __, ___, fiber) => {
         set.add(fiber);
         return _continue;
      },
      (_, fiber) => {
         set.delete(fiber);
         return _continue;
      }
   );
});

/**
 * Creates a new supervisor that tracks children in a set.
 */
export const fibersIn = (ref: Atomic<Set<RuntimeFiber<any, any>>>) =>
   T.total(
      () =>
         new Supervisor(
            ref.get,
            (_, __, ___, fiber) => {
               pipe(
                  ref,
                  R.unsafeUpdate((s) => s.add(fiber))
               );
               return _continue;
            },
            (_, fiber) => {
               pipe(
                  ref,
                  R.unsafeUpdate((s) => {
                     s.delete(fiber);
                     return s;
                  })
               );
               return _continue;
            }
         )
   );

/**
 * A supervisor that doesn't do anything in response to supervision events.
 */
export const none = new Supervisor<void>(
   T.unit,
   () => _continue,
   () => _continue
);
