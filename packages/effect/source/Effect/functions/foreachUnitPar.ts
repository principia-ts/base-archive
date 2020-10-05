import * as A from "@principia/core/Array";
import { flow, pipe } from "@principia/core/Function";

import * as C from "../../Cause";
import { ExecutionStrategy, Parallel, ParallelN, Sequential } from "../../ExecutionStrategy";
import { joinAll } from "../../Fiber/functions/joinAll";
import { fork as forkManaged, use_ as _useManaged } from "../../Managed/core";
import * as Sema from "../../Semaphore";
import { fail as promiseFail } from "../../XPromise/functions/fail";
import { make as promiseMake } from "../../XPromise/functions/make";
import { succeed as promiseSucceed } from "../../XPromise/functions/succeed";
import { wait as promiseWait } from "../../XPromise/functions/wait";
import * as XR from "../../XRef/combinators";
import * as T from "../core";
import { ensuring } from "./bracket";
import { checkFiberId } from "./checkFiberId";
import { _onInterruptExtended, makeInterruptible, makeUninterruptible } from "./interrupt";
import { toManaged } from "./toManaged";

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `foreach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 */
export function _foreachUnitPar<R, E, A>(
   as: Iterable<A>,
   f: (a: A) => T.Effect<R, E, any>
): T.Effect<R, E, void> {
   const arr = Array.from(as);
   const size = arr.length;

   if (size === 0) {
      return T.unit;
   }

   return pipe(
      T.of,
      T.bindS("parentId", () => checkFiberId()),
      T.bindS("causes", () => XR.makeRef<C.Cause<E>>(C.empty)),
      T.bindS("result", () => promiseMake<void, void>()),
      T.bindS("status", () => XR.makeRef([0, 0, false] as [number, number, boolean])),
      T.letS("startTask", (s) =>
         pipe(
            s.status,
            XR.modify(([started, done, failing]): [boolean, [number, number, boolean]] =>
               failing ? [false, [started, done, failing]] : [true, [started + 1, done, failing]]
            )
         )
      ),
      T.letS("startFailure", (s) =>
         pipe(
            s.status,
            XR.update(([started, done, _]): [number, number, boolean] => [started, done, true]),
            T.tap(() => promiseFail<void>(undefined)(s.result))
         )
      ),
      T.letS("task", (s) => (a: A) =>
         makeUninterruptible(
            T.whenM(s.startTask)(
               pipe(
                  T.suspend(() => f(a)),
                  makeInterruptible,
                  T.tapCause((c) =>
                     pipe(
                        s.causes,
                        XR.update((l) => C.both(l, c)),
                        T.chain(() => s.startFailure)
                     )
                  ),
                  ensuring(
                     T.whenM(
                        pipe(
                           s.status,
                           XR.modify(([started, done, failing]) => [
                              (failing ? started : size) === done + 1,
                              [started, done + 1, failing] as [number, number, boolean]
                           ])
                        )
                     )(promiseSucceed<void>(undefined)(s.result))
                  )
               )
            )
         )
      ),
      T.bindS("fibers", (s) => T._foreach(arr, (a) => T.fork(s.task(a)))),
      T.letS("interruptor", (s) =>
         pipe(
            s.result,
            promiseWait,
            T.catchAll(() =>
               T._chain(
                  T._foreach(s.fibers, (f) => T.fork(f.interruptAs(s.parentId))),
                  joinAll
               )
            ),
            toManaged(),
            forkManaged
         )
      ),
      T.tap((s) =>
         _useManaged(s.interruptor, () =>
            _onInterruptExtended(
               T.whenM(
                  T._map(
                     T._foreach(s.fibers, (f) => f.await),
                     flow(
                        A.findr((e) => e._tag === "Failure"),
                        (m) => m._tag === "Just"
                     )
                  )
               )(
                  T._chain(promiseFail<void>(undefined)(s.result), () =>
                     T._chain(s.causes.get, (x) => T.halt(x))
                  )
               ),
               () =>
                  T._chain(promiseFail<void>(undefined)(s.result), () =>
                     T._chain(
                        T._foreach(s.fibers, (f) => f.await),
                        () => T._chain(s.causes.get, (x) => T.halt(x))
                     )
                  )
            )
         )
      ),
      T.asUnit
   );
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `foreach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 */
export const foreachUnitPar = <X, R, E, A>(f: (a: A) => T.Effect<R, E, any>) => (
   as: Iterable<A>
): T.Effect<R, E, void> => _foreachUnitPar(as, f);
