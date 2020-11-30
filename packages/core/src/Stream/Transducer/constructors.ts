import * as A from "../../Array";
import type * as Eq from "../../Eq";
import type { Predicate } from "../../Function";
import { not, pipe, tuple } from "../../Function";
import * as I from "../../IO";
import type { Cause } from "../../IO/Cause";
import * as Ex from "../../IO/Exit";
import * as XRef from "../../IORef";
import * as XRefM from "../../IORefM";
import * as M from "../../Managed";
import type { Finalizer } from "../../Managed/ReleaseMap";
import * as Map from "../../Map";
import * as O from "../../Option";
import * as Set from "../../Set";
import * as Tup from "../../Tuple";
import { filter } from "./filterable";
import { map, map_, mapM_ } from "./functor";
import { Transducer } from "./model";

/**
 * Creates a transducer that always fails with the specified failure.
 */
export function fail<E>(e: E): Transducer<unknown, E, unknown, never> {
  return new Transducer(M.succeed((_) => I.fail(e)));
}

/**
 * Creates a transducer that always dies with the specified exception.
 */
export function die(error: unknown): Transducer<unknown, never, unknown, never> {
  return new Transducer(M.succeed((_) => I.die(error)));
}

/**
 * Creates a transducer that always fails with the specified cause.
 */
export function halt<E>(c: Cause<E>): Transducer<unknown, E, unknown, never> {
  return new Transducer(M.succeed((_) => I.halt(c)));
}

/**
 * The identity transducer. Passes elements through.
 */
export function identity<I>(): Transducer<unknown, never, I, I> {
  return fromPush(O.fold(() => I.succeed(A.empty()), I.succeed));
}

/**
 * Creates a transducer from a chunk processing function.
 */
export function fromPush<R, E, I, O>(
  push: (input: O.Option<ReadonlyArray<I>>) => I.IO<R, E, ReadonlyArray<O>>
): Transducer<R, E, I, O> {
  return new Transducer(M.succeed(push));
}

/**
 * Creates a transducer that always evaluates the specified effect.
 */
export function fromEffect<R, E, A>(io: I.IO<R, E, A>): Transducer<R, E, unknown, A> {
  return new Transducer(M.succeed((_: any) => I.map_(io, A.pure)));
}

/**
 * Creates a transducer that purely transforms incoming values.
 */
export function fromFunction<I, O>(f: (i: I) => O): Transducer<unknown, never, I, O> {
  return map_(identity(), f);
}

/**
 * Creates a transducer that effectfully transforms incoming values.
 */
export function fromFunctionM<R, E, I, O>(f: (i: I) => I.IO<R, E, O>): Transducer<R, E, I, O> {
  return mapM_(identity(), f);
}

/**
 * Creates a transducer that returns the first element of the stream, if it exists.
 */
export function head<O>(): Transducer<unknown, never, O, O.Option<O>> {
  return reduce(O.none(), (acc, o) =>
    O.fold_(
      acc,
      () => O.some(o),
      () => acc
    )
  );
}

/**
 * Creates a transducer that returns the last element of the stream, if it exists.
 */
export function last<O>(): Transducer<unknown, never, O, O.Option<O>> {
  return reduce(O.none(), (_, a) => O.some(a));
}

/**
 * Emits the provided chunk before emitting any other value.
 */
export function prepend<O>(values: ReadonlyArray<O>): Transducer<unknown, never, O, O> {
  return new Transducer(
    M.map_(XRef.makeManaged(values), (state) => (is: O.Option<ReadonlyArray<O>>) =>
      O.fold_(
        is,
        () => XRef.getAndSet_(state, A.empty()),
        (xs) =>
          pipe(
            state,
            XRef.getAndSet(A.empty()),
            I.map((c) => (A.isEmpty(c) ? xs : A.concat_(c, xs)))
          )
      )
    )
  );
}

/**
 * Reads the first n values from the stream and uses them to choose the transducer that will be used for the remainder of the stream.
 * If the stream ends before it has collected n values the partial chunk will be provided to f.
 */
export function branchAfter<R, E, I, O>(
  n: number,
  f: (c: ReadonlyArray<I>) => Transducer<R, E, I, O>
): Transducer<R, E, I, O> {
  interface Collecting {
    _tag: "Collecting";
    data: ReadonlyArray<I>;
  }
  interface Emitting {
    _tag: "Emitting";
    finalizer: Finalizer;
    push: (is: O.Option<ReadonlyArray<I>>) => I.IO<R, E, ReadonlyArray<O>>;
  }
  type State = Collecting | Emitting;
  const initialState: State = {
    _tag: "Collecting",
    data: A.empty()
  };

  const toCollect = Math.max(0, n);

  return new Transducer(
    M.chain_(M.scope(), (scope) =>
      M.map_(XRefM.makeManaged<State>(initialState), (state) => (is: O.Option<ReadonlyArray<I>>) =>
        O.fold_(
          is,
          () =>
            pipe(
              XRefM.getAndSet_(state, initialState),
              I.chain((s) => {
                switch (s._tag) {
                  case "Collecting": {
                    return M.use_(f(s.data).push, (f) => f(O.none()));
                  }
                  case "Emitting": {
                    return I.apFirst_(s.push(O.none()), s.finalizer(Ex.unit()));
                  }
                }
              })
            ),
          (data) =>
            XRefM.modify_(state, (s) => {
              switch (s._tag) {
                case "Emitting": {
                  return I.map_(s.push(O.some(data)), (_) => [_, s] as const);
                }
                case "Collecting": {
                  if (A.isEmpty(data)) {
                    return I.succeed([A.empty<O>(), s] as const);
                  } else {
                    const remaining = toCollect - s.data.length;
                    if (remaining <= data.length) {
                      const [newCollected, remainder] = A.splitAt(remaining)(data);
                      return I.chain_(
                        scope.apply(f(A.concat_(s.data, newCollected)).push),
                        ([finalizer, push]) =>
                          I.map_(
                            push(O.some(remainder)),
                            (_) => [_, { _tag: "Emitting", finalizer, push }] as const
                          )
                      );
                    } else {
                      return I.succeed([
                        A.empty<O>(),
                        { _tag: "Collecting", data: A.concat_(s.data, data) }
                      ] as const);
                    }
                  }
                }
              }
            })
        )
      )
    )
  );
}

/**
 * Creates a transducer that starts consuming values as soon as one fails
 * the predicate `p`.
 */
export function dropWhile<I>(predicate: Predicate<I>): Transducer<unknown, never, I, I> {
  return new Transducer(
    M.map_(XRef.makeManaged(true), (dropping) => (is: O.Option<ReadonlyArray<I>>) =>
      O.fold_(
        is,
        () => I.succeed(A.empty()),
        (is) =>
          XRef.modify_(dropping, (b) => {
            switch (b) {
              case true: {
                const is1 = A.dropWhile_(is, predicate);
                return [is1, is1.length === 0];
              }
              case false: {
                return [is, false];
              }
            }
          })
      )
    )
  );
}

/**
 * Creates a transducer that starts consuming values as soon as one fails
 * the effectful predicate `p`.
 */
export function dropWhileM<R, E, I>(p: (i: I) => I.IO<R, E, boolean>): Transducer<R, E, I, I> {
  return new Transducer(
    pipe(
      M.do,
      M.bindS("dropping", () => XRef.makeManaged(true)),
      M.letS("push", ({ dropping }) => (is: O.Option<ReadonlyArray<I>>) =>
        O.fold_(
          is,
          () => I.succeed(A.empty<I>()),
          (is) =>
            pipe(
              dropping.get,
              I.chain((b) =>
                b
                  ? I.map_(A.dropWhileEffect_(is, p), (l) => [l, A.isEmpty(l)] as const)
                  : I.succeed([is, false] as const)
              ),
              I.chain(([is, pt]) => I.as_(dropping.set(pt), () => is))
            )
        )
      ),
      M.map(({ push }) => push)
    )
  );
}

/**
 * Creates a transducer by folding over a structure of type `O` for as long as
 * `contFn` results in `true`. The transducer will emit a value when `contFn`
 * evaluates to `false` and then restart the folding.
 */
export function fold<I, O>(
  initial: O,
  contFn: (o: O) => boolean,
  f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
  const go = (
    in_: ReadonlyArray<I>,
    state: O,
    progress: boolean
  ): readonly [ReadonlyArray<O>, O, boolean] => {
    return pipe(
      in_,
      A.reduce([A.empty<O>(), state, progress] as const, ([os0, state, _], i) => {
        const o = f(state, i);
        if (contFn(o)) {
          return [os0, o, true] as const;
        } else {
          return [A.append_(os0, o), initial, false] as const;
        }
      })
    );
  };
  return new Transducer(
    M.map_(XRef.makeManaged(O.some(initial)), (state) => (is: O.Option<ReadonlyArray<I>>) =>
      O.fold_(
        is,
        () => pipe(XRef.getAndSet_(state, O.none()), I.map(O.fold(() => A.empty(), A.pure))),
        (in_) =>
          XRef.modify_(state, (s) => {
            const [o, s2, progress] = go(
              in_,
              O.getOrElse_(s, () => initial),
              O.isSome(s)
            );
            if (progress) {
              return [o, O.some(s2)];
            } else {
              return [o, O.none()];
            }
          })
      )
    )
  );
}

/**
 * Creates a transducer by folding over a structure of type `O`. The transducer will
 * fold the inputs until the stream ends, resulting in a stream with one element.
 */
export function reduce<I, O>(
  initial: O,
  f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
  return fold(initial, () => true, f);
}

/**
 * Creates a sink by effectfully folding over a structure of type `S`.
 */
export function foldM<R, E, I, O>(
  initial: O,
  cont: (o: O) => boolean,
  f: (output: O, input: I) => I.IO<R, E, O>
): Transducer<R, E, I, O> {
  const init = O.some(initial);
  const go = (
    in_: ReadonlyArray<I>,
    state: O,
    progress: boolean
  ): I.IO<R, E, readonly [ReadonlyArray<O>, O, boolean]> =>
    A.reduce_(
      in_,
      I.succeed([A.empty(), state, progress]) as I.IO<
        R,
        E,
        readonly [ReadonlyArray<O>, O, boolean]
      >,
      (b, i) =>
        I.chain_(b, ([os0, state, _]) =>
          I.map_(f(state, i), (o) => {
            if (cont(o)) {
              return [os0, o, true] as const;
            } else {
              return [A.append_(os0, o), initial, false] as const;
            }
          })
        )
    );
  return new Transducer(
    M.map_(XRef.makeManaged(init), (state) => (is: O.Option<ReadonlyArray<I>>) =>
      O.fold_(
        is,
        () => pipe(state, XRef.getAndSet(O.none()), I.map(O.fold(() => A.empty(), A.pure))),
        (in_) =>
          pipe(
            state,
            XRef.get,
            I.chain((s) =>
              go(
                in_,
                O.getOrElse_(s, () => initial),
                O.isSome(s)
              )
            ),
            I.chain(([os, s, progress]) =>
              progress
                ? I.apSecond_(state.set(O.some(s)), I.succeed(os))
                : I.apSecond_(state.set(O.none()), I.succeed(os))
            )
          )
      )
    )
  );
}

/**
 * Creates a transducer by effectfully folding over a structure of type `O`. The transducer will
 * fold the inputs until the stream ends, resulting in a stream with one element.
 */
export function reduceM<R, E, I, O>(
  initial: O,
  f: (output: O, input: I) => I.IO<R, E, O>
): Transducer<R, E, I, O> {
  return foldM(initial, () => true, f);
}

/**
 * Creates a transducer that folds elements of type `I` into a structure
 * of type `O` until `max` elements have been folded.
 *
 * Like `foldWeighted`, but with a constant cost function of 1.
 */
export function foldUntil<I, O>(
  initial: O,
  max: number,
  f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
  return pipe(
    fold(
      tuple(initial, 0),
      ([_, n]) => n < max,
      ([o, count], i: I) => [f(o, i), count + 1] as const
    ),
    map(Tup.fst)
  );
}

/**
 * Creates a transducer that effectfully folds elements of type `I` into a structure
 * of type `O` until `max` elements have been folded.
 *
 * Like `foldWeightedM`, but with a constant cost function of 1.
 */
export function foldUntilM<R, E, I, O>(
  initial: O,
  max: number,
  f: (output: O, input: I) => I.IO<R, E, O>
): Transducer<R, E, I, O> {
  return pipe(
    foldM(
      tuple(initial, 0),
      ([_, n]) => n < max,
      ([o, count], i: I) => I.map_(f(o, i), (o) => [o, count + 1] as const)
    ),
    map(Tup.fst)
  );
}

/**
 * Creates a transducer that folds elements of type `I` into a structure
 * of type `O`, until `max` worth of elements (determined by the `costFn`)
 * have been folded.
 *
 * The `decompose` function will be used for decomposing elements that
 * cause an `O` aggregate to cross `max` into smaller elements.
 *
 * Be vigilant with this function, it has to generate "simpler" values
 * or the fold may never end. A value is considered indivisible if
 * `decompose` yields the empty chunk or a single-valued chunk. In
 * these cases, there is no other choice than to yield a value that
 * will cross the threshold.
 *
 * The `foldWeightedDecomposeM` allows the decompose function
 * to return a `IO`, and consequently it allows the transducer
 * to fail.
 */
export function foldWeightedDecompose<I, O>(
  initial: O,
  costFn: (output: O, input: I) => number,
  max: number,
  decompose: (input: I) => ReadonlyArray<I>,
  f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
  interface FoldWeightedState {
    result: O;
    cost: number;
  }

  const initialState: FoldWeightedState = {
    result: initial,
    cost: 0
  };

  const go = (
    in_: ReadonlyArray<I>,
    os0: ReadonlyArray<O>,
    state: FoldWeightedState,
    dirty: boolean
  ): readonly [ReadonlyArray<O>, FoldWeightedState, boolean] =>
    A.reduce_(in_, [os0, state, dirty] as const, ([os0, state, _], i) => {
      const total = state.cost + costFn(state.result, i);

      if (total > max) {
        const is = decompose(i);
        if (is.length <= 1 && !dirty) {
          return [
            A.append_(os0, f(state.result, A.isNonEmpty(is) ? is[0] : i)),
            initialState,
            false
          ] as const;
        } else if (is.length <= 1 && dirty) {
          const elem = A.isNonEmpty(is) ? is[0] : i;
          return [
            A.append_(os0, state.result),
            { result: f(initialState.result, elem), cost: costFn(initialState.result, elem) },
            true
          ] as const;
        } else {
          return go(is, os0, state, dirty);
        }
      } else {
        return [os0, { result: f(state.result, i), cost: total }, true] as const;
      }
    });

  return new Transducer(
    M.map_(XRef.makeManaged(O.some(initialState)), (state) => (is: O.Option<ReadonlyArray<I>>) =>
      O.fold_(
        is,
        () =>
          pipe(
            state,
            XRef.getAndSet(O.none()),
            I.map(
              O.fold(
                () => A.empty(),
                (s) => [s.result]
              )
            )
          ),
        (in_) =>
          XRef.modify_(state, (s) => {
            const [o, s2, dirty] = go(
              in_,
              A.empty(),
              O.getOrElse_(s, () => initialState),
              O.isSome(s)
            );
            if (dirty) {
              return [o, O.some(s2)];
            } else {
              return [o, O.none()];
            }
          })
      )
    )
  );
}

/**
 * Creates a transducer that effectfully folds elements of type `I` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`) have
 * been folded.
 *
 * The `decompose` function will be used for decomposing elements that
 * cause an `S` aggregate to cross `max` into smaller elements. Be vigilant with
 * this function, it has to generate "simpler" values or the fold may never end.
 * A value is considered indivisible if `decompose` yields the empty chunk or a
 * single-valued chunk. In these cases, there is no other choice than to yield
 * a value that will cross the threshold.
 *
 * See `foldWeightedDecompose` for an example.
 */
export function foldWeightedDecomposeM<R, E, I, O>(
  initial: O,
  costFn: (output: O, input: I) => I.IO<R, E, number>,
  max: number,
  decompose: (input: I) => I.IO<R, E, ReadonlyArray<I>>,
  f: (output: O, input: I) => I.IO<R, E, O>
): Transducer<R, E, I, O> {
  interface FoldWeightedState {
    result: O;
    cost: number;
  }

  const initialState: FoldWeightedState = {
    result: initial,
    cost: 0
  };

  const go = (
    in_: ReadonlyArray<I>,
    os: ReadonlyArray<O>,
    state: FoldWeightedState,
    dirty: boolean
  ): I.IO<R, E, readonly [ReadonlyArray<O>, FoldWeightedState, boolean]> =>
    A.reduce_(
      in_,
      I.succeed([os, state, dirty]) as I.IO<
        R,
        E,
        readonly [ReadonlyArray<O>, FoldWeightedState, boolean]
      >,
      (o, i) =>
        I.chain_(o, ([os, state, _]) =>
          I.chain_(costFn(state.result, i), (cost) => {
            const total = cost + state.cost;
            if (total > max) {
              return I.chain_(decompose(i), (is) => {
                if (is.length <= 1 && !dirty) {
                  return I.map_(
                    f(state.result, A.isNonEmpty(is) ? is[0] : i),
                    (o) => [A.append_(os, o), initialState, false] as const
                  );
                } else if (is.length <= 1 && dirty) {
                  const elem = A.isNonEmpty(is) ? is[0] : i;
                  return I.zipWith_(
                    f(initialState.result, elem),
                    costFn(initialState.result, elem),
                    (result, cost) => [A.append_(os, state.result), { result, cost }, true]
                  );
                } else {
                  return go(is, os, state, dirty);
                }
              });
            } else {
              return I.map_(
                f(state.result, i),
                (o) => [os, { result: o, cost: total }, true] as const
              );
            }
          })
        )
    );

  return new Transducer(
    M.map_(XRef.makeManaged(O.some(initialState)), (state) => (is: O.Option<ReadonlyArray<I>>) =>
      O.fold_(
        is,
        () =>
          pipe(
            state,
            XRef.getAndSet(O.none()),
            I.map(
              O.fold(
                () => A.empty(),
                (s) => [s.result]
              )
            )
          ),
        (in_) =>
          pipe(
            state,
            XRef.get,
            I.chain((s) =>
              go(
                in_,
                A.empty(),
                O.getOrElse_(s, () => initialState),
                O.isSome(s)
              )
            ),
            I.chain(([os, s, dirty]) =>
              dirty
                ? I.apSecond_(state.set(O.some(s)), I.succeed(os))
                : I.apSecond_(state.set(O.none()), I.succeed(os))
            )
          )
      )
    )
  );
}

/**
 * Creates a transducer that folds elements of type `I` into a structure
 * of type `O`, until `max` worth of elements (determined by the `costFn`)
 * have been folded.
 *
 * @note Elements that have an individual cost larger than `max` will
 * force the transducer to cross the `max` cost. See `foldWeightedDecompose`
 * for a variant that can handle these cases.
 */
export function foldWeighted<I, O>(
  initial: O,
  costFn: (o: O, i: I) => number,
  max: number,
  f: (o: O, i: I) => O
): Transducer<unknown, never, I, O> {
  return foldWeightedDecompose(initial, costFn, max, A.pure, f);
}

/**
 * Creates a transducer accumulating incoming values into chunks of maximum size `n`.
 */
export function collectAllN<I>(n: number): Transducer<unknown, never, I, ReadonlyArray<I>> {
  const go = (
    in_: ReadonlyArray<I>,
    leftover: ReadonlyArray<I>,
    acc: ReadonlyArray<ReadonlyArray<I>>
  ): [ReadonlyArray<ReadonlyArray<I>>, ReadonlyArray<I>] => {
    const [left, nextIn] = A.splitAt(n - leftover.length)(in_);
    if (leftover.length + left.length < n) return [acc, A.concat_(leftover, left)];
    else {
      const nextOut = !A.isEmpty(leftover)
        ? A.append_(acc, A.concat_(leftover, left))
        : A.append_(acc, left);
      return go(nextIn, A.empty(), nextOut);
    }
  };

  return new Transducer(
    M.map_(XRef.makeManaged(A.empty<I>()), (state) => (is: O.Option<ReadonlyArray<I>>) =>
      O.fold_(
        is,
        () =>
          I.map_(XRef.getAndSet_(state, A.empty()), (leftover) =>
            !A.isEmpty(leftover) ? [leftover] : A.empty()
          ),
        (in_) => XRef.modify_(state, (leftover) => go(in_, leftover, A.empty()))
      )
    )
  );
}

/**
 * Creates a transducer accumulating incoming values into maps of up to `n` keys. Elements
 * are mapped to keys using the function `key`; elements mapped to the same key will
 * be merged with the function `f`.
 */
export function collectAllToMapN<K, I>(
  n: number,
  key: (i: I) => K,
  merge: (i: I, i1: I) => I
): Transducer<unknown, never, I, ReadonlyMap<K, I>> {
  return pipe(
    foldWeighted<I, ReadonlyMap<K, I>>(
      Map.empty(),
      (acc, i) => (acc.has(key(i)) ? 0 : 1),
      n,
      (acc, i) => {
        const k = key(i);
        if (acc.has(k)) return Map.insert_(acc, k, merge(acc.get(k) as I, i));
        else return Map.insert_(acc, k, i);
      }
    ),
    filter(not(Map.isEmpty))
  );
}

/**
 * Creates a transducer accumulating incoming values into sets of maximum size `n`.
 */
export function collectAllToSetN<I>(
  E: Eq.Eq<I>
): (n: number) => Transducer<unknown, never, I, ReadonlySet<I>> {
  const insertE = Set.insert_(E);
  return (n) =>
    pipe(
      foldWeighted<I, ReadonlySet<I>>(
        Set.empty(),
        (acc, i) => (acc.has(i) ? 0 : 1),
        n,
        (acc, i) => insertE(acc, i)
      ),
      filter((set) => set.size !== 0)
    );
}

/**
 * Accumulates incoming elements into a chunk as long as they verify predicate `p`.
 */
export function collectAllWhile<I>(
  p: Predicate<I>
): Transducer<unknown, never, I, ReadonlyArray<I>> {
  return pipe(
    fold<I, [ReadonlyArray<I>, boolean]>([A.empty(), true], Tup.snd, ([is, _], i) =>
      p(i) ? [A.append_(is, i), true] : [is, false]
    ),
    map(Tup.fst),
    filter(A.isNonEmpty)
  );
}

/**
 * Accumulates incoming elements into a chunk as long as they verify effectful predicate `p`.
 */
export function collectAllWhileM<R, E, I>(
  p: (i: I) => I.IO<R, E, boolean>
): Transducer<R, E, I, ReadonlyArray<I>> {
  return pipe(
    foldM<R, E, I, [ReadonlyArray<I>, boolean]>([A.empty(), true], Tup.snd, ([is, _], i) =>
      I.map_(p(i), (b) => (b ? [A.append_(is, i), true] : [is, false]))
    ),
    map(Tup.fst),
    filter(A.isNonEmpty)
  );
}
