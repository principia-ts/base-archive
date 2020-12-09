import type { Chunk } from "../../Chunk";
import * as C from "../../Chunk";
import type { Either } from "../../Either";
import * as E from "../../Either";
import { pipe } from "../../Function";
import * as I from "../../IO";
import * as Ca from "../../IO/Cause";
import type { HasClock } from "../../IO/Clock";
import { currentTime } from "../../IO/Clock";
import * as Ex from "../../IO/Exit";
import * as F from "../../IO/Fiber";
import * as XR from "../../IORef";
import * as M from "../../Managed/_core";
import type { Option } from "../../Option";
import * as O from "../../Option";
import * as Push from "../Push";
import { Transducer } from "../Transducer";
import { fail } from "./constructors";
import { map_ } from "./functor";
import { Sink } from "./model";

/**
 * Replaces this sink's result with the provided value.
 */
export function as_<R, E, I, L, Z, Z1>(sz: Sink<R, E, I, L, Z>, z1: Z1): Sink<R, E, I, L, Z1> {
  return map_(sz, () => z1);
}

/**
 * Replaces this sink's result with the provided value.
 */
export function as<Z1>(z1: Z1): <R, E, I, L, Z>(sz: Sink<R, E, I, L, Z>) => Sink<R, E, I, L, Z1> {
  return (sz) => as_(sz, z1);
}

/**
 * Repeatedly runs the sink for as long as its results satisfy
 * the predicate `p`. The sink's results will be accumulated
 * using the stepping function `f`.
 */
export function collectAllWhileWith_<R, E, I, L, Z, S>(
  sz: Sink<R, E, I, L, Z>,
  z: S,
  p: (z: Z) => boolean,
  f: (s: S, z: Z) => S
): Sink<R, E, I, L, S> {
  return new Sink(
    pipe(
      XR.makeManaged(z),
      M.chain((acc) => {
        return pipe(
          Push.restartable(sz.push),
          M.map(([push, restart]) => {
            const go = (
              s: S,
              in_: O.Option<Chunk<I>>,
              end: boolean
            ): I.IO<R, [E.Either<E, S>, Chunk<L>], S> =>
              I.catchAll_(
                I.as_(push(in_), () => s),
                ([e, leftover]) =>
                  E.fold_(
                    e,
                    (e) => Push.fail(e, leftover),
                    (z) => {
                      if (p(z)) {
                        const s1 = f(s, z);

                        if (leftover.length === 0) {
                          if (end) {
                            return Push.emit(s1, C.empty());
                          } else {
                            return I.as_(restart, () => s1);
                          }
                        } else {
                          return I.apSecond_(
                            restart,
                            go(s1, O.some((leftover as unknown) as Chunk<I>), end)
                          );
                        }
                      } else {
                        return Push.emit(s, leftover);
                      }
                    }
                  )
              );

            return (in_: O.Option<Chunk<I>>) =>
              I.chain_(acc.get, (s) => I.chain_(go(s, in_, O.isNone(in_)), (s1) => acc.set(s1)));
          })
        );
      })
    )
  );
}

/**
 * Repeatedly runs the sink for as long as its results satisfy
 * the predicate `p`. The sink's results will be accumulated
 * using the stepping function `f`.
 */
export function collectAllWhileWith<R, E, I, L, Z, S>(
  z: S,
  p: (z: Z) => boolean,
  f: (s: S, z: Z) => S
): (sz: Sink<R, E, I, L, Z>) => Sink<R, E, I, L, S> {
  return (sz) => collectAllWhileWith_(sz, z, p, f);
}

/**
 * Runs both sinks in parallel on the input, returning the result or the error from the
 * one that finishes first.
 */
export function raceBoth_<R, E, I, L, Z, R1, E1, I1, L1, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R1 & R, E1 | E, I & I1, L1 | L, E.Either<Z, Z1>> {
  return new Sink(
    pipe(
      M.do,
      M.bindS("p1", () => self.push),
      M.bindS("p2", () => that.push),
      M.map(({ p1, p2 }) => (i: Option<Chunk<I & I1>>): I.IO<
        R1 & R,
        readonly [Either<E | E1, Either<Z, Z1>>, Chunk<L | L1>],
        void
      > =>
        I.raceWith_(
          p1(i),
          p2(i),
          (res1, fib2) =>
            Ex.foldM_(
              res1,
              (f) =>
                I.apSecond_(
                  F.interrupt(fib2),
                  I.halt(
                    pipe(
                      f,
                      Ca.map(([r, leftover]) => [E.map_(r, E.left), leftover] as const)
                    )
                  )
                ),
              () =>
                I.mapError_(
                  F.join(fib2),
                  ([r, leftover]) => [E.map_(r, E.right), leftover] as const
                )
            ),
          (res2, fib1) =>
            Ex.foldM_(
              res2,
              (f) =>
                I.apSecond_(
                  F.interrupt(fib1),
                  I.halt(
                    pipe(
                      f,
                      Ca.map(([r, leftover]) => [E.map_(r, E.right), leftover] as const)
                    )
                  )
                ),
              () =>
                I.mapError_(F.join(fib1), ([r, leftover]) => [E.map_(r, E.left), leftover] as const)
            )
        )
      )
    )
  );
}

export function dropLeftover<R, E, I, L, Z>(sz: Sink<R, E, I, L, Z>): Sink<R, E, I, never, Z> {
  return new Sink(
    M.map_(sz.push, (p) => (in_: O.Option<Chunk<I>>) =>
      I.mapError_(p(in_), ([v, _]) => [v, C.empty()])
    )
  );
}

/**
 * Runs both sinks in parallel on the input, , returning the result or the error from the
 * one that finishes first.
 */
export function race_<R, R1, E, E1, I, I1, L, L1, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z | Z1> {
  return map_(raceBoth_(self, that), E.merge);
}

/**
 * Runs both sinks in parallel on the input, , returning the result or the error from the
 * one that finishes first.
 */
export function race<R1, E1, I1, L1, Z1>(that: Sink<R1, E1, I1, L1, Z1>) {
  return <R, E, I, L, Z>(self: Sink<R, E, I, L, Z>) => race_(self, that);
}

/**
 * Returns the sink that executes this one and times its execution.
 */
export function timed<R, E, I, L, Z>(
  self: Sink<R, E, I, L, Z>
): Sink<R & HasClock, E, I, L, readonly [Z, number]> {
  return new Sink(
    pipe(
      self.push,
      M.zipWith(I.toManaged_(currentTime), (push, start) => {
        return (in_: O.Option<Chunk<I>>) =>
          I.catchAll_(
            push(in_),
            ([e, leftover]): I.IO<
              R & HasClock,
              [E.Either<E, readonly [Z, number]>, Chunk<L>],
              never
            > =>
              E.fold_(
                e,
                (e) => Push.fail(e, leftover),
                (z) =>
                  I.chain_(currentTime, (stop) => Push.emit([z, stop - start] as const, leftover))
              )
          );
      })
    )
  );
}

/**
 * Converts this sink to a transducer that feeds incoming elements to the sink
 * and emits the sink's results as outputs. The sink will be restarted when
 * it ends.
 */
export function toTransducer<R, E, I, L extends I, Z>(
  self: Sink<R, E, I, L, Z>
): Transducer<R, E, I, Z> {
  return new Transducer(
    M.map_(Push.restartable(self.push), ([push, restart]) => {
      const go = (input: O.Option<Chunk<I>>): I.IO<R, E, Chunk<Z>> =>
        I.foldM_(
          push(input),
          ([e, leftover]) =>
            E.fold_(
              e,
              (e) => I.fail(e),
              (z) =>
                I.andThen_(
                  restart,
                  C.isEmpty(leftover) || O.isNone(input)
                    ? I.succeed([z])
                    : I.map_(go(O.some(leftover)), (more) => [z, ...more])
                )
            ),
          (_) => I.succeed(C.empty())
        );

      return (input: O.Option<Chunk<I>>) => go(input);
    })
  );
}

/**
 * Creates a sink that produces values until one verifies
 * the predicate `f`.
 */
export function untilOutputM_<R, R1, E, E1, I, L extends I, Z>(
  self: Sink<R, E, I, L, Z>,
  f: (z: Z) => I.IO<R1, E1, boolean>
): Sink<R & R1, E | E1, I, L, O.Option<Z>> {
  return new Sink(
    M.map_(Push.restartable(self.push), ([push, restart]) => {
      const go = (
        in_: O.Option<Chunk<I>>,
        end: boolean
      ): I.IO<R & R1, readonly [E.Either<E | E1, O.Option<Z>>, Chunk<L>], void> => {
        return I.catchAll_(push(in_), ([e, leftover]) =>
          E.fold_(
            e,
            (e) => Push.fail(e, leftover),
            (z) =>
              I.chain_(
                I.mapError_(f(z), (err) => [E.left(err), leftover] as const),
                (satisfied) => {
                  if (satisfied) {
                    return Push.emit(O.some(z), leftover);
                  } else if (C.isEmpty(leftover)) {
                    return end ? Push.emit(O.none(), C.empty()) : I.andThen_(restart, Push.more);
                  } else {
                    return go(O.some(leftover) as O.Option<Chunk<I>>, end);
                  }
                }
              )
          )
        );
      };

      return (is: O.Option<Chunk<I>>) => go(is, O.isNone(is));
    })
  );
}

/**
 * Creates a sink that produces values until one verifies
 * the predicate `f`.
 */
export function untilOutputM<R1, E1, Z>(f: (z: Z) => I.IO<R1, E1, boolean>) {
  return <R, E, I, L extends I>(self: Sink<R, E, I, L, Z>) => untilOutputM_(self, f);
}

/**
 * A sink that depends on another managed value
 * `resource` will be finalized after the processing.
 */
export function managed_<R, E, A, I, L extends I, Z>(
  resource: M.Managed<R, E, A>,
  fn: (a: A) => Sink<R, E, I, L, Z>
): Sink<R, E, I, I, Z> {
  return new Sink(
    M.chain_(
      M.fold_(
        resource,
        (err) => fail(err)<I>() as Sink<R, E, I, I, Z>,
        (m) => fn(m)
      ),
      (_) => _.push
    )
  );
}

/**
 * A sink that depends on another managed value
 * `resource` will be finalized after the processing.
 */
export function managed<R, E, A>(resource: M.Managed<R, E, A>) {
  return <I, L extends I, Z>(fn: (a: A) => Sink<R, E, I, L, Z>): Sink<R, E, I, I, Z> =>
    managed_(resource, fn);
}

/**
 * Exposes leftover
 */
export function exposeLeftover<R, E, I, L, Z>(
  ma: Sink<R, E, I, L, Z>
): Sink<R, E, I, never, readonly [Z, Chunk<L>]> {
  return new Sink(
    M.map_(ma.push, (push) => {
      return (in_: O.Option<Chunk<I>>) =>
        I.mapError_(push(in_), ([v, leftover]) => {
          return [E.map_(v, (z) => [z, leftover] as const), C.empty<never>()] as const;
        });
    })
  );
}
