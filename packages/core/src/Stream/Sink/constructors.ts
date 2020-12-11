import { flow, identity } from "@principia/prelude";

import type { Chunk } from "../../Chunk";
import * as C from "../../Chunk";
import * as E from "../../Either";
import { pipe } from "../../Function";
import * as I from "../../IO";
import type { Cause } from "../../IO/Cause";
import * as Ca from "../../IO/Cause";
import type { HasClock } from "../../IO/Clock";
import * as XR from "../../IORef";
import * as M from "../../Managed";
import * as O from "../../Option";
import * as Sy from "../../Sync";
import * as Tu from "../../Tuple";
import * as Push from "../Push";
import { timed } from "./combinators";
import { map_ } from "./functor";
import { Sink } from "./model";

/**
 * Creates a sink from a Push
 */
export function fromPush<R, E, I, L, Z>(push: Push.Push<R, E, I, L, Z>): Sink<R, E, I, L, Z> {
  return new Sink(M.succeed(push));
}

/**
 * Creates a Sink from a managed `Push`
 */
export function fromManagedPush<R, E, I, L, Z>(
  push: M.Managed<R, never, Push.Push<R, E, I, L, Z>>
): Sink<R, E, I, L, Z> {
  return new Sink(push);
}

/**
 * Creates a single-value sink produced from an effect
 */
export function fromEffect<R, E, I, Z>(io: I.IO<R, E, Z>): Sink<R, E, I, I, Z> {
  return fromPush<R, E, I, I, Z>((in_) => {
    const leftover = O.fold_(in_, () => C.empty(), identity);
    return I.fold_(
      io,
      (e) => Push.fail(e, leftover),
      (z) => Push.emit(z, leftover)
    );
  });
}

/**
 * A sink that immediately ends with the specified value.
 */
export function succeed<Z, I>(z: Z): Sink<unknown, never, I, I, Z> {
  return fromPush<unknown, never, I, I, Z>((c) => {
    const leftover = O.fold_(c, () => C.empty<I>(), identity);
    return Push.emit(z, leftover);
  });
}

/**
 * A sink that always fails with the specified error.
 */
export function fail<E>(e: E) {
  return <I>(): Sink<unknown, E, I, I, void> =>
    fromPush((c) => {
      const leftover = O.fold_(c, () => C.empty<I>(), identity);
      return Push.fail(e, leftover);
    });
}

/**
 * Creates a sink halting with a specified cause.
 */
export function halt<E>(cause: Cause<E>): Sink<unknown, E, unknown, never, never> {
  return fromPush((_) => Push.halt(cause));
}

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export function fromForeach<I, R1, E1>(f: (i: I) => I.IO<R1, E1, any>): Sink<R1, E1, I, I, void> {
  const go = (
    chunk: Chunk<I>,
    idx: number,
    len: number
  ): I.IO<R1, [E.Either<E1, never>, Chunk<I>], void> => {
    if (idx === len) {
      return Push.more;
    } else {
      return pipe(
        f(chunk[idx]),
        I.foldM(
          (e) => Push.fail(e, C.drop_(chunk, idx + 1)),
          () => go(chunk, idx + 1, len)
        )
      );
    }
  };

  return fromPush(
    O.fold(
      () => Push.emit<never, void>(undefined, C.empty()),
      (is: Chunk<I>) => go(is, 0, is.length)
    )
  );
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function fromForeachChunk<R, E, I>(
  f: (chunk: Chunk<I>) => I.IO<R, E, any>
): Sink<R, E, I, never, void> {
  return fromPush(
    O.fold(
      () => Push.emit(undefined, C.empty()),
      (is) =>
        I.apSecond_(
          I.mapError_(f(is), (e) => [E.left(e), C.empty()]),
          Push.more
        )
    )
  );
}

/**
 * A sink that executes the provided effectful function for every element fed to it
 * until `f` evaluates to `false`.
 */
export function foreachWhile<R, E, I>(f: (i: I) => I.IO<R, E, boolean>): Sink<R, E, I, I, void> {
  const go = (
    chunk: C.Chunk<I>,
    idx: number,
    len: number
  ): I.IO<R, readonly [E.Either<E, void>, C.Chunk<I>], void> => {
    if (idx === len) {
      return Push.more;
    } else {
      return I.foldM_(
        f(chunk[idx]),
        (e) => Push.fail(e, C.drop_(chunk, idx + 1)),
        (b) => {
          if (b) {
            return go(chunk, idx + 1, len);
          } else {
            return Push.emit<I, void>(undefined, C.drop_(chunk, idx));
          }
        }
      );
    }
  };

  return fromPush((in_: O.Option<C.Chunk<I>>) =>
    O.fold_(
      in_,
      () => Push.emit<never, void>(undefined, C.empty()),
      (is) => go(is, 0, is.length)
    )
  );
}

const dropLeftover = <R, E, I, L, Z>(sz: Sink<R, E, I, L, Z>): Sink<R, E, I, never, Z> =>
  new Sink(
    M.map_(sz.push, (p) => (in_: O.Option<Chunk<I>>) =>
      I.mapError_(p(in_), ([v, _]) => [v, C.empty()])
    )
  );

/**
 * A sink that ignores its inputs.
 */
export const drain: Sink<unknown, never, unknown, never, void> = dropLeftover(
  fromForeach((_) => I.unit())
);

/**
 * Creates a sink containing the first value.
 */
export function head<I>(): Sink<unknown, never, I, I, O.Option<I>> {
  return new Sink(
    M.succeed(
      O.fold(
        () => Push.emit(O.none(), C.empty()),
        (is) => (C.isEmpty(is) ? Push.more : Push.emit(C.head(is), C.drop_(is, 1)))
      )
    )
  );
}

export function last<I>(): Sink<unknown, never, I, never, O.Option<I>> {
  return new Sink(
    M.map_(M.fromEffect(XR.make<O.Option<I>>(O.none())), (state) => (is: O.Option<Chunk<I>>) =>
      pipe(
        state.get,
        I.chain((last) =>
          O.fold_(
            is,
            () => Push.emit(last, C.empty<never>()),
            flow(
              C.last,
              O.fold(
                () => Push.more,
                (l) => I.apSecond_(state.set(O.some(l)), Push.more)
              )
            )
          )
        )
      )
    )
  );
}

/**
 * A sink that takes the specified number of values.
 */
export function take<I>(n: number): Sink<unknown, never, I, I, Chunk<I>> {
  return new Sink(
    M.map_(M.fromEffect(XR.make<Chunk<I>>(C.empty())), (state) => (is: O.Option<Chunk<I>>) =>
      pipe(
        state.get,
        I.chain((take) =>
          O.fold_(
            is,
            () => (n >= 0 ? Push.emit(take, C.empty<I>()) : Push.emit(C.empty<I>(), take)),
            (ch) => {
              const remaining = n - take.length;
              if (remaining <= ch.length) {
                const [chunk, leftover] = C.splitAt_(ch, remaining);
                return I.apSecond_(
                  state.set(C.empty()),
                  Push.emit(C.concat_(take, chunk), leftover)
                );
              } else {
                return I.apSecond_(state.set(C.concat_(take, ch)), Push.more);
              }
            }
          )
        )
      )
    )
  );
}

export function reduceChunksM_<R, E, I, Z>(
  z: Z,
  cont: (z: Z) => boolean,
  f: (z: Z, i: Chunk<I>) => I.IO<R, E, Z>
): Sink<R, E, I, I, Z> {
  return cont(z)
    ? new Sink(
        M.map_(M.fromEffect(XR.make(z)), (state) => (is: O.Option<Chunk<I>>) =>
          O.fold_(
            is,
            () => I.chain_(state.get, (s) => Push.emit(s, C.empty())),
            (is) =>
              pipe(
                state.get,
                I.chain((s) => f(s, is)),
                I.mapError((e) => Tu.tuple_(E.left(e), C.empty<I>())),
                I.chain((s) =>
                  cont(s) ? I.apSecond_(state.set(s), Push.more) : Push.emit(s, C.empty<I>())
                )
              )
          )
        )
      )
    : succeed(z);
}

/**
 * A sink that effectfully folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function reduceChunksM<R, E, I, Z>(
  z: Z,
  f: (z: Z, i: Chunk<I>) => I.IO<R, E, Z>
): Sink<R, E, I, never, Z> {
  return dropLeftover(reduceChunksM_(z, (_) => true, f));
}

/**
 * A sink that folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export function reduceChunksWhile<I, Z>(
  z: Z,
  cont: (z: Z) => boolean,
  f: (z: Z, i: Chunk<I>) => Z
): Sink<unknown, never, I, I, Z> {
  return reduceChunksM_(z, cont, (z, i) => I.succeed(f(z, i)));
}

/**
 * A sink that folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function reduceChunks<I, Z>(
  z: Z,
  f: (z: Z, i: Chunk<I>) => Z
): Sink<unknown, never, I, never, Z> {
  return dropLeftover(reduceChunksWhile(z, () => true, f));
}

/**
 * A sink that effectfully folds its inputs with the provided function, termination predicate and initial state.
 *
 * This sink may terminate in the middle of a chunk and discard the rest of it. See the discussion on the
 * ZSink class scaladoc on sinks vs. transducers.
 */
export function reduceWhileM<R, E, I, Z>(
  z: Z,
  cont: (z: Z) => boolean,
  f: (z: Z, i: I) => I.IO<R, E, Z>
): Sink<R, E, I, I, Z> {
  const foldChunk = (
    z: Z,
    chunk: Chunk<I>,
    i: number,
    len: number
  ): I.IO<R, readonly [E, Chunk<I>], readonly [Z, O.Option<Chunk<I>>]> => {
    if (i === len) {
      return I.succeed([z, O.none()]);
    } else {
      return I.foldM_(
        f(z, chunk[i]),
        (e) => I.fail([e, C.drop_(chunk, i + 1)]),
        (s) =>
          cont(s) ? foldChunk(s, chunk, i + 1, len) : I.succeed([s, O.some(C.drop_(chunk, i + 1))])
      );
    }
  };

  if (cont(z)) {
    return new Sink(
      M.map_(M.fromEffect(XR.make(z)), (state) => (is: O.Option<Chunk<I>>) =>
        O.fold_(
          is,
          () => I.chain_(state.get, (s) => Push.emit(s, C.empty())),
          (is) =>
            I.chain_(state.get, (z) =>
              I.foldM_(
                foldChunk(z, is, 0, is.length),
                (err) => Push.fail(Tu.fst(err), Tu.snd(err)),
                ([st, l]) =>
                  O.fold_(
                    l,
                    () => I.apSecond_(state.set(st), Push.more),
                    (leftover) => Push.emit(st, leftover)
                  )
              )
            )
        )
      )
    );
  } else {
    return succeed(z);
  }
}

/**
 * A sink that folds its inputs with the provided function, termination predicate and initial state.
 */
export function reduceWhile<I, Z>(
  z: Z,
  cont: (z: Z) => boolean,
  f: (z: Z, i: I) => Z
): Sink<unknown, never, I, I, Z> {
  const foldChunk = (
    z: Z,
    chunk: Chunk<I>,
    i: number,
    len: number
  ): Sy.USync<readonly [Z, O.Option<Chunk<I>>]> =>
    Sy.gen(function* (_) {
      if (i === len) {
        return [z, O.none()];
      } else {
        const z1 = f(z, chunk[i]);
        return cont(z1)
          ? yield* _(foldChunk(z1, chunk, i + 1, len))
          : [z1, O.some(C.drop_(chunk, i + 1))];
      }
    });

  if (cont(z)) {
    return new Sink(
      M.map_(M.fromEffect(XR.make(z)), (state) => (is: O.Option<Chunk<I>>) =>
        O.fold_(
          is,
          () => I.chain_(state.get, (s) => Push.emit(s, C.empty())),
          (is) =>
            I.chain_(state.get, (z) =>
              I.chain_(foldChunk(z, is, 0, is.length), ([st, l]) =>
                O.fold_(
                  l,
                  () => I.apSecond_(state.set(st), Push.more),
                  (leftover) => Push.emit(st, leftover)
                )
              )
            )
        )
      )
    );
  } else {
    return succeed(z);
  }
}

/**
 * A sink that folds its inputs with the provided function and initial state.
 */
export function reduce<I, Z>(z: Z, f: (z: Z, i: I) => Z): Sink<unknown, never, I, never, Z> {
  return dropLeftover(reduceWhile(z, (_) => true, f));
}

/**
 * A sink that collects all of its inputs into an array.
 */
export function collectAll<A>(): Sink<unknown, never, A, never, Chunk<A>> {
  return reduceChunks(C.empty(), (s, i) => C.concat_(s, i));
}

/**
 * A sink that collects all of its inputs into a map. The keys are extracted from inputs
 * using the keying function `key`; if multiple inputs use the same key, they are merged
 * using the `f` function.
 */
export function collectAllToMap<A, K>(key: (a: A) => K) {
  return (f: (a: A, a1: A) => A): Sink<unknown, never, A, never, ReadonlyMap<K, A>> =>
    new Sink(
      M.suspend(
        () =>
          reduceChunks(new Map<K, A>(), (acc, as: Chunk<A>) =>
            C.reduce_(as, acc, (acc, a) => {
              const k = key(a);
              const v = acc.get(k);

              return acc.set(k, v ? f(v, a) : a);
            })
          ).push
      )
    );
}

/**
 * A sink that collects all of its inputs into a set.
 */
export function collectAllToSet<A>(): Sink<unknown, never, A, never, Set<A>> {
  return map_(collectAll<A>(), (as) => new Set(as));
}

/**
 * A sink that counts the number of elements fed to it.
 */
export const count: Sink<unknown, never, unknown, never, number> = reduce(0, (s, _) => s + 1);

/**
 * Creates a sink halting with the specified message, wrapped in a
 * `RuntimeException`.
 */
export function dieMessage(m: string): Sink<unknown, never, unknown, never, never> {
  return halt(Ca.die(new Ca.RuntimeError(m)));
}

/**
 * A sink that sums incoming numeric values.
 */
export const sum: Sink<unknown, never, number, never, number> = reduce(0, (a, b) => a + b);

/**
 * A sink with timed execution.
 */
export const timedDrain: Sink<HasClock, never, unknown, never, number> = map_(
  timed(drain),
  ([_, a]) => a
);
