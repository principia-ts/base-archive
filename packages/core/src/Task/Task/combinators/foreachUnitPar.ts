import * as T from "../_core";
import * as A from "../../../Array/_core";
import { flow, pipe, tuple } from "../../../Function";
import * as O from "../../../Option";
import * as Ex from "../../Exit";
import * as C from "../../Exit/Cause";
import type { Exit } from "../../Exit/model";
import { interrupt as interruptFiber } from "../../Fiber/combinators/interrupt";
import type { Executor } from "../../Fiber/executor";
import type { Fiber } from "../../Fiber/model";
import { fromTask } from "../../Managed/_core";
import { Managed } from "../../Managed/model";
import * as RM from "../../Managed/ReleaseMap";
import * as XP from "../../XPromise";
import * as XR from "../../XRef/_core";
import { forkDaemon } from "./core-scope";
import { bracketExit_, ensuring } from "./bracket";
import { fiberId } from "./fiberId";
import {
  makeInterruptible,
  makeUninterruptible,
  onInterruptExtended_,
  uninterruptibleMask
} from "./interrupt";

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
export function foreachUnitPar_<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => T.Task<R, E, any>
): T.Task<R, E, void> {
  const arr = Array.from(as);
  const size = arr.length;

  if (size === 0) {
    return T.unit();
  }

  return pipe(
    T.do,
    T.bindS("parentId", () => fiberId()),
    T.bindS("causes", () => XR.makeRef<C.Cause<E>>(C.empty)),
    T.bindS("result", () => XP.make<void, void>()),
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
        T.tap(() => XP.fail<void>(undefined)(s.result))
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
              )(XP.succeed<void>(undefined)(s.result))
            )
          )
        )
      )
    ),
    T.bindS("fibers", (s) => T.foreach_(arr, (a) => T.fork(s.task(a)))),
    T.letS("interruptor", (s) =>
      pipe(
        s.result,
        XP.await,
        T.catchAll(() =>
          T.chain_(
            T.foreach_(s.fibers, (f) => T.fork(f.interruptAs(s.parentId))),
            joinAllFibers
          )
        ),
        fromTask,
        forkManaged
      )
    ),
    T.tap((s) =>
      useManaged_(s.interruptor, () =>
        onInterruptExtended_(
          T.whenM(
            T.map_(
              T.foreach_(s.fibers, (f) => f.await),
              flow(
                A.findFirst((e) => e._tag === "Failure"),
                (m) => m._tag === "Some"
              )
            )
          )(
            T.chain_(XP.fail<void>(undefined)(s.result), () =>
              T.chain_(s.causes.get, (x) => T.halt(x))
            )
          ),
          () =>
            T.chain_(XP.fail<void>(undefined)(s.result), () =>
              T.chain_(
                T.foreach_(s.fibers, (f) => f.await),
                () => T.chain_(s.causes.get, (x) => T.halt(x))
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
export function foreachUnitPar<R, E, A>(
  f: (a: A) => T.Task<R, E, any>
): (as: Iterable<A>) => T.Task<R, E, void> {
  return (as) => foreachUnitPar_(as, f);
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
function foreachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => T.Task<R, E, B>
): T.Task<R, E, ReadonlyArray<B>> {
  const arr = Array.from(as);

  return T.chain_(
    T.total<B[]>(() => []),
    (array) => {
      const fn = ([a, n]: [A, number]) =>
        T.chain_(
          T.suspend(() => f(a)),
          (b) =>
            T.total(() => {
              array[n] = b;
            })
        );
      return T.chain_(
        foreachUnitPar_(
          arr.map((a, n) => [a, n] as [A, number]),
          fn
        ),
        () => T.total(() => array)
      );
    }
  );
}

function joinAllFibers<E, A>(as: Iterable<Fiber<E, A>>) {
  return T.tap_(T.chain_(awaitAllFibers(as), T.done), () => T.foreach_(as, (f) => f.inheritRefs));
}

function awaitAllFibers<E, A>(
  as: Iterable<Fiber<E, A>>
): T.Task<unknown, never, Exit<E, ReadonlyArray<A>>> {
  return T.result(foreachPar_(as, (f) => T.chain_(f.await, T.done)));
}

function useManaged_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => T.Task<R2, E2, B>
): T.Task<R & R2, E | E2, B> {
  return bracketExit_(
    RM.make,
    (rm) =>
      T.chain_(
        T.gives_(self.task, (r: R) => tuple(r, rm)),
        (a) => f(a[1])
      ),
    releaseAllSeq_
  );
}

function forkManaged<R, E, A>(self: Managed<R, E, A>): Managed<R, never, Executor<E, A>> {
  return new Managed(
    uninterruptibleMask(({ restore }) =>
      pipe(
        T.do,
        T.bindS("tp", () => T.ask<readonly [R, RM.ReleaseMap]>()),
        T.letS("r", ({ tp }) => tp[0]),
        T.letS("outerReleaseMap", ({ tp }) => tp[1]),
        T.bindS("innerReleaseMap", () => RM.make),
        T.bindS("fiber", ({ innerReleaseMap, r }) =>
          restore(
            pipe(
              self.task,
              T.map(([_, a]) => a),
              forkDaemon,
              T.giveAll([r, innerReleaseMap] as const)
            )
          )
        ),
        T.bindS("releaseMapEntry", ({ fiber, innerReleaseMap, outerReleaseMap }) =>
          RM.add((e) =>
            pipe(
              fiber,
              interruptFiber,
              T.chain(() => releaseAllSeq_(innerReleaseMap, e))
            )
          )(outerReleaseMap)
        ),
        T.map(({ fiber, releaseMapEntry }) => [releaseMapEntry, fiber])
      )
    )
  );
}

function releaseAllSeq_(_: RM.ReleaseMap, exit: Exit<any, any>): T.IO<any> {
  return pipe(
    _.ref,
    XR.modify((s): [T.IO<any>, RM.State] => {
      switch (s._tag) {
        case "Exited": {
          return [T.unit(), s];
        }
        case "Running": {
          return [
            T.chain_(
              T.foreach_(Array.from(RM.finalizers(s)).reverse(), ([_, f]) => T.result(f(exit))),
              (e) => T.done(O.getOrElse_(Ex.collectAll(...e), () => Ex.succeed([])))
            ),
            new RM.Exited(s.nextKey, exit)
          ];
        }
      }
    }),
    T.flatten
  );
}
