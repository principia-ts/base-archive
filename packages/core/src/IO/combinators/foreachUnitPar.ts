import * as A from "../../Array/_core";
import { flow, pipe, tuple } from "../../Function";
import * as XR from "../../IORef/_core";
import { fromEffect } from "../../Managed/_core";
import { Managed } from "../../Managed/model";
import * as RM from "../../Managed/ReleaseMap";
import * as O from "../../Option";
import * as XP from "../../Promise";
import * as I from "../_core";
import * as C from "../Cause";
import * as Ex from "../Exit";
import type { Exit } from "../Exit/model";
import { interrupt as interruptFiber } from "../Fiber/combinators/interrupt";
import type { Executor } from "../Fiber/executor";
import type { Fiber } from "../Fiber/model";
import { bracketExit_, ensuring } from "./bracket";
import { forkDaemon } from "./core-scope";
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
  f: (a: A) => I.IO<R, E, any>
): I.IO<R, E, void> {
  const arr = Array.from(as);
  const size = arr.length;

  if (size === 0) {
    return I.unit();
  }

  return pipe(
    I.do,
    I.bindS("parentId", () => fiberId()),
    I.bindS("causes", () => XR.make<C.Cause<E>>(C.empty)),
    I.bindS("result", () => XP.make<void, void>()),
    I.bindS("status", () => XR.make([0, 0, false] as [number, number, boolean])),
    I.letS("startEffect", (s) =>
      pipe(
        s.status,
        XR.modify(([started, done, failing]): [boolean, [number, number, boolean]] =>
          failing ? [false, [started, done, failing]] : [true, [started + 1, done, failing]]
        )
      )
    ),
    I.letS("startFailure", (s) =>
      pipe(
        s.status,
        XR.update(([started, done, _]): [number, number, boolean] => [started, done, true]),
        I.tap(() => XP.fail<void>(undefined)(s.result))
      )
    ),
    I.letS("effect", (s) => (a: A) =>
      makeUninterruptible(
        I.whenM(s.startEffect)(
          pipe(
            I.suspend(() => f(a)),
            makeInterruptible,
            I.tapCause((c) =>
              pipe(
                s.causes,
                XR.update((l) => C.both(l, c)),
                I.chain(() => s.startFailure)
              )
            ),
            ensuring(
              I.whenM(
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
    I.bindS("fibers", (s) => I.foreach_(arr, (a) => I.fork(s.effect(a)))),
    I.letS("interruptor", (s) =>
      pipe(
        s.result,
        XP.await,
        I.catchAll(() =>
          I.chain_(
            I.foreach_(s.fibers, (f) => I.fork(f.interruptAs(s.parentId))),
            joinAllFibers
          )
        ),
        fromEffect,
        forkManaged
      )
    ),
    I.tap((s) =>
      useManaged_(s.interruptor, () =>
        onInterruptExtended_(
          I.whenM(
            I.map_(
              I.foreach_(s.fibers, (f) => f.await),
              flow(
                A.findFirst((e) => e._tag === "Failure"),
                (m) => m._tag === "Some"
              )
            )
          )(
            I.chain_(XP.fail<void>(undefined)(s.result), () =>
              I.chain_(s.causes.get, (x) => I.halt(x))
            )
          ),
          () =>
            I.chain_(XP.fail<void>(undefined)(s.result), () =>
              I.chain_(
                I.foreach_(s.fibers, (f) => f.await),
                () => I.chain_(s.causes.get, (x) => I.halt(x))
              )
            )
        )
      )
    ),
    I.asUnit
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
  f: (a: A) => I.IO<R, E, any>
): (as: Iterable<A>) => I.IO<R, E, void> {
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
  f: (a: A) => I.IO<R, E, B>
): I.IO<R, E, ReadonlyArray<B>> {
  const arr = Array.from(as);

  return I.chain_(
    I.total<B[]>(() => []),
    (array) => {
      const fn = ([a, n]: [A, number]) =>
        I.chain_(
          I.suspend(() => f(a)),
          (b) =>
            I.total(() => {
              array[n] = b;
            })
        );
      return I.chain_(
        foreachUnitPar_(
          arr.map((a, n) => [a, n] as [A, number]),
          fn
        ),
        () => I.total(() => array)
      );
    }
  );
}

function joinAllFibers<E, A>(as: Iterable<Fiber<E, A>>) {
  return I.tap_(I.chain_(awaitAllFibers(as), I.done), () => I.foreach_(as, (f) => f.inheritRefs));
}

function awaitAllFibers<E, A>(
  as: Iterable<Fiber<E, A>>
): I.IO<unknown, never, Exit<E, ReadonlyArray<A>>> {
  return I.result(foreachPar_(as, (f) => I.chain_(f.await, I.done)));
}

function useManaged_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => I.IO<R2, E2, B>
): I.IO<R & R2, E | E2, B> {
  return bracketExit_(
    RM.make,
    (rm) =>
      I.chain_(
        I.gives_(self.io, (r: R) => tuple(r, rm)),
        (a) => f(a[1])
      ),
    releaseAllSeq_
  );
}

function forkManaged<R, E, A>(self: Managed<R, E, A>): Managed<R, never, Executor<E, A>> {
  return new Managed(
    uninterruptibleMask(({ restore }) =>
      pipe(
        I.do,
        I.bindS("tp", () => I.ask<readonly [R, RM.ReleaseMap]>()),
        I.letS("r", ({ tp }) => tp[0]),
        I.letS("outerReleaseMap", ({ tp }) => tp[1]),
        I.bindS("innerReleaseMap", () => RM.make),
        I.bindS("fiber", ({ innerReleaseMap, r }) =>
          restore(
            pipe(
              self.io,
              I.map(([_, a]) => a),
              forkDaemon,
              I.giveAll([r, innerReleaseMap] as const)
            )
          )
        ),
        I.bindS("releaseMapEntry", ({ fiber, innerReleaseMap, outerReleaseMap }) =>
          RM.add((e) =>
            pipe(
              fiber,
              interruptFiber,
              I.chain(() => releaseAllSeq_(innerReleaseMap, e))
            )
          )(outerReleaseMap)
        ),
        I.map(({ fiber, releaseMapEntry }) => [releaseMapEntry, fiber])
      )
    )
  );
}

function releaseAllSeq_(_: RM.ReleaseMap, exit: Exit<any, any>): I.UIO<any> {
  return pipe(
    _.ref,
    XR.modify((s): [I.UIO<any>, RM.State] => {
      switch (s._tag) {
        case "Exited": {
          return [I.unit(), s];
        }
        case "Running": {
          return [
            I.chain_(
              I.foreach_(Array.from(RM.finalizers(s)).reverse(), ([_, f]) => I.result(f(exit))),
              (e) => I.done(O.getOrElse_(Ex.collectAll(...e), () => Ex.succeed([])))
            ),
            new RM.Exited(s.nextKey, exit)
          ];
        }
      }
    }),
    I.flatten
  );
}
