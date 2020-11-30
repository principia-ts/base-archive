import { pipe } from "../../Function";
import type { Atomic } from "../../IORef";
import * as R from "../../IORef/atomic";
import * as I from "../_core";
import type { RuntimeFiber } from "../Fiber";
import { _continue, Supervisor } from "./model";

/**
 * Creates a new supervisor that tracks children in a set.
 */
export const track = I.total(() => {
  const set = new Set<RuntimeFiber<any, any>>();

  return new Supervisor<RuntimeFiber<any, any>[]>(
    I.total(() => Array.from(set)),
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
  I.total(
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
  I.unit(),
  () => _continue,
  () => _continue
);
