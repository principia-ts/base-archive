import * as A from "../../../Array";
import type * as Eq from "../../../Eq";
import type { Predicate } from "../../../Function";
import { not, pipe, tuple } from "../../../Function";
import * as Map from "../../../Map";
import * as O from "../../../Option";
import * as Set from "../../../Set";
import * as Tup from "../../../Tuple";
import * as Ex from "../../Exit";
import type { Cause } from "../../Exit/Cause";
import * as M from "../../Managed";
import type { Finalizer } from "../../Managed/ReleaseMap";
import * as T from "../../Task";
import * as XR from "../../XRef";
import * as XRM from "../../XRefM";
import { filter } from "./filterable";
import { map, map_, mapM_ } from "./functor";
import { Transducer } from "./model";

export function fail<E>(e: E): Transducer<unknown, E, unknown, never> {
   return new Transducer(M.succeed((_) => T.fail(e)));
}

export function die(error: unknown): Transducer<unknown, never, unknown, never> {
   return new Transducer(M.succeed((_) => T.die(error)));
}

export function halt<E>(c: Cause<E>): Transducer<unknown, E, unknown, never> {
   return new Transducer(M.succeed((_) => T.halt(c)));
}

export function identity<I>(): Transducer<unknown, never, I, I> {
   return fromPush(O.fold(() => T.succeed(A.empty()), T.succeed));
}

export function fromPush<R, E, I, O>(
   push: (input: O.Option<ReadonlyArray<I>>) => T.Task<R, E, ReadonlyArray<O>>
): Transducer<R, E, I, O> {
   return new Transducer(M.succeed(push));
}

export function fromTask<R, E, A>(task: T.Task<R, E, A>): Transducer<R, E, unknown, A> {
   return new Transducer(M.succeed((_: any) => T.map_(task, A.pure)));
}

export function fromFunction<I, O>(f: (i: I) => O): Transducer<unknown, never, I, O> {
   return map_(identity(), f);
}

export function fromFunctionM<R, E, I, O>(f: (i: I) => T.Task<R, E, O>): Transducer<R, E, I, O> {
   return mapM_(identity(), f);
}

export function head<O>(): Transducer<unknown, never, O, O.Option<O>> {
   return reduce(O.none(), (acc, o) =>
      O.fold_(
         acc,
         () => O.some(o),
         () => acc
      )
   );
}

export function last<O>(): Transducer<unknown, never, O, O.Option<O>> {
   return reduce(O.none(), (_, a) => O.some(a));
}

export function prepend<O>(values: ReadonlyArray<O>): Transducer<unknown, never, O, O> {
   return new Transducer(
      M.map_(XR.makeManagedRef(values), (state) => (is: O.Option<ReadonlyArray<O>>) =>
         O.fold_(
            is,
            () => XR.getAndSet_(state, A.empty()),
            (xs) =>
               pipe(
                  state,
                  XR.getAndSet(A.empty()),
                  T.map((c) => (A.isEmpty(c) ? xs : A.concat_(c, xs)))
               )
         )
      )
   );
}

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
      push: (is: O.Option<ReadonlyArray<I>>) => T.Task<R, E, ReadonlyArray<O>>;
   }
   type State = Collecting | Emitting;
   const initialState: State = {
      _tag: "Collecting",
      data: A.empty()
   };

   const toCollect = Math.max(0, n);

   return new Transducer(
      M.chain_(M.scope(), (scope) =>
         M.map_(XRM.makeManagedRefM<State>(initialState), (state) => (is: O.Option<ReadonlyArray<I>>) =>
            O.fold_(
               is,
               () =>
                  pipe(
                     XRM.getAndSet_(state, initialState),
                     T.chain((s) => {
                        switch (s._tag) {
                           case "Collecting": {
                              return M.use_(f(s.data).push, (f) => f(O.none()));
                           }
                           case "Emitting": {
                              return T.apFirst_(s.push(O.none()), s.finalizer(Ex.unit()));
                           }
                        }
                     })
                  ),
               (data) =>
                  XRM.modify_(state, (s) => {
                     switch (s._tag) {
                        case "Emitting": {
                           return T.map_(s.push(O.some(data)), (_) => [_, s] as const);
                        }
                        case "Collecting": {
                           if (A.isEmpty(data)) {
                              return T.succeed([A.empty<O>(), s] as const);
                           } else {
                              const remaining = toCollect - s.data.length;
                              if (remaining <= data.length) {
                                 const [newCollected, remainder] = A.splitAt(remaining)(data);
                                 return T.chain_(
                                    scope.apply(f(A.concat_(s.data, newCollected)).push),
                                    ([finalizer, push]) =>
                                       T.map_(
                                          push(O.some(remainder)),
                                          (_) => [_, { _tag: "Emitting", finalizer, push }] as const
                                       )
                                 );
                              } else {
                                 return T.succeed([
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

export function dropWhile<I>(predicate: Predicate<I>): Transducer<unknown, never, I, I> {
   return new Transducer(
      M.map_(XR.makeManagedRef(true), (dropping) => (is: O.Option<ReadonlyArray<I>>) =>
         O.fold_(
            is,
            () => T.succeed(A.empty()),
            (is) =>
               XR.modify_(dropping, (b) => {
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

export function dropWhileM<R, E, I>(p: (i: I) => T.Task<R, E, boolean>): Transducer<R, E, I, I> {
   return new Transducer(
      pipe(
         M.do,
         M.bindS("dropping", () => XR.makeManagedRef(true)),
         M.letS("push", ({ dropping }) => (is: O.Option<ReadonlyArray<I>>) =>
            O.fold_(
               is,
               () => T.succeed(A.empty<I>()),
               (is) =>
                  pipe(
                     dropping.get,
                     T.chain((b) =>
                        b
                           ? T.map_(A.dropWhileTask_(is, p), (l) => [l, A.isEmpty(l)] as const)
                           : T.succeed([is, false] as const)
                     ),
                     T.chain(([is, pt]) => T.as_(dropping.set(pt), () => is))
                  )
            )
         ),
         M.map(({ push }) => push)
      )
   );
}

export function fold<I, O>(
   initial: O,
   cont: (o: O) => boolean,
   f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
   const go = (in_: ReadonlyArray<I>, state: O, progress: boolean): readonly [ReadonlyArray<O>, O, boolean] => {
      return pipe(
         in_,
         A.reduce([A.empty<O>(), state, progress] as const, ([os0, state, _], i) => {
            const o = f(state, i);
            if (cont(o)) {
               return [os0, o, true] as const;
            } else {
               return [A.append_(os0, o), initial, false] as const;
            }
         })
      );
   };
   return new Transducer(
      M.map_(XR.makeManagedRef(O.some(initial)), (state) => (is: O.Option<ReadonlyArray<I>>) =>
         O.fold_(
            is,
            () => pipe(XR.getAndSet_(state, O.none()), T.map(O.fold(() => A.empty(), A.pure))),
            (in_) =>
               XR.modify_(state, (s) => {
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

export function reduce<I, O>(initial: O, f: (output: O, input: I) => O): Transducer<unknown, never, I, O> {
   return fold(initial, () => true, f);
}

export function foldM<R, E, I, O>(
   initial: O,
   cont: (o: O) => boolean,
   f: (output: O, input: I) => T.Task<R, E, O>
): Transducer<R, E, I, O> {
   const init = O.some(initial);
   const go = (
      in_: ReadonlyArray<I>,
      state: O,
      progress: boolean
   ): T.Task<R, E, readonly [ReadonlyArray<O>, O, boolean]> =>
      A.reduce_(
         in_,
         T.succeed([A.empty(), state, progress]) as T.Task<R, E, readonly [ReadonlyArray<O>, O, boolean]>,
         (b, i) =>
            T.chain_(b, ([os0, state, _]) =>
               T.map_(f(state, i), (o) => {
                  if (cont(o)) {
                     return [os0, o, true] as const;
                  } else {
                     return [A.append_(os0, o), initial, false] as const;
                  }
               })
            )
      );
   return new Transducer(
      M.map_(XR.makeManagedRef(init), (state) => (is: O.Option<ReadonlyArray<I>>) =>
         O.fold_(
            is,
            () => pipe(state, XR.getAndSet(O.none()), T.map(O.fold(() => A.empty(), A.pure))),
            (in_) =>
               pipe(
                  state,
                  XR.get,
                  T.chain((s) =>
                     go(
                        in_,
                        O.getOrElse_(s, () => initial),
                        O.isSome(s)
                     )
                  ),
                  T.chain(([os, s, progress]) =>
                     progress
                        ? T.apSecond_(state.set(O.some(s)), T.succeed(os))
                        : T.apSecond_(state.set(O.none()), T.succeed(os))
                  )
               )
         )
      )
   );
}

export function reduceM<R, E, I, O>(initial: O, f: (output: O, input: I) => T.Task<R, E, O>): Transducer<R, E, I, O> {
   return foldM(initial, () => true, f);
}

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

export function foldUnitM<R, E, I, O>(
   initial: O,
   max: number,
   f: (output: O, input: I) => T.Task<R, E, O>
): Transducer<R, E, I, O> {
   return pipe(
      foldM(
         tuple(initial, 0),
         ([_, n]) => n < max,
         ([o, count], i: I) => T.map_(f(o, i), (o) => [o, count + 1] as const)
      ),
      map(Tup.fst)
   );
}

export function foldWeightedDecompose<I, O>(
   initial: O,
   cost: (output: O, input: I) => number,
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
         const total = state.cost + cost(state.result, i);

         if (total > max) {
            const is = decompose(i);
            if (is.length <= 1 && !dirty) {
               return [A.append_(os0, f(state.result, A.isNonEmpty(is) ? is[0] : i)), initialState, false] as const;
            } else if (is.length <= 1 && dirty) {
               const elem = A.isNonEmpty(is) ? is[0] : i;
               return [
                  A.append_(os0, state.result),
                  { result: f(initialState.result, elem), cost: cost(initialState.result, elem) },
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
      M.map_(XR.makeManagedRef(O.some(initialState)), (state) => (is: O.Option<ReadonlyArray<I>>) =>
         O.fold_(
            is,
            () =>
               pipe(
                  state,
                  XR.getAndSet(O.none()),
                  T.map(
                     O.fold(
                        () => A.empty(),
                        (s) => [s.result]
                     )
                  )
               ),
            (in_) =>
               XR.modify_(state, (s) => {
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

export function foldWeightedDecomposeM<R, E, I, O>(
   initial: O,
   costFn: (output: O, input: I) => T.Task<R, E, number>,
   max: number,
   decompose: (input: I) => T.Task<R, E, ReadonlyArray<I>>,
   f: (output: O, input: I) => T.Task<R, E, O>
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
   ): T.Task<R, E, readonly [ReadonlyArray<O>, FoldWeightedState, boolean]> =>
      A.reduce_(
         in_,
         T.succeed([os, state, dirty]) as T.Task<R, E, readonly [ReadonlyArray<O>, FoldWeightedState, boolean]>,
         (o, i) =>
            T.chain_(o, ([os, state, _]) =>
               T.chain_(costFn(state.result, i), (cost) => {
                  const total = cost + state.cost;
                  if (total > max) {
                     return T.chain_(decompose(i), (is) => {
                        if (is.length <= 1 && !dirty) {
                           return T.map_(
                              f(state.result, A.isNonEmpty(is) ? is[0] : i),
                              (o) => [A.append_(os, o), initialState, false] as const
                           );
                        } else if (is.length <= 1 && dirty) {
                           const elem = A.isNonEmpty(is) ? is[0] : i;
                           return T.mapBoth_(
                              f(initialState.result, elem),
                              costFn(initialState.result, elem),
                              (result, cost) => [A.append_(os, state.result), { result, cost }, true]
                           );
                        } else {
                           return go(is, os, state, dirty);
                        }
                     });
                  } else {
                     return T.map_(f(state.result, i), (o) => [os, { result: o, cost: total }, true] as const);
                  }
               })
            )
      );

   return new Transducer(
      M.map_(XR.makeManagedRef(O.some(initialState)), (state) => (is: O.Option<ReadonlyArray<I>>) =>
         O.fold_(
            is,
            () =>
               pipe(
                  state,
                  XR.getAndSet(O.none()),
                  T.map(
                     O.fold(
                        () => A.empty(),
                        (s) => [s.result]
                     )
                  )
               ),
            (in_) =>
               pipe(
                  state,
                  XR.get,
                  T.chain((s) =>
                     go(
                        in_,
                        A.empty(),
                        O.getOrElse_(s, () => initialState),
                        O.isSome(s)
                     )
                  ),
                  T.chain(([os, s, dirty]) =>
                     dirty
                        ? T.apSecond_(state.set(O.some(s)), T.succeed(os))
                        : T.apSecond_(state.set(O.none()), T.succeed(os))
                  )
               )
         )
      )
   );
}

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
         const nextOut = !A.isEmpty(leftover) ? A.append_(acc, A.concat_(leftover, left)) : A.append_(acc, left);
         return go(nextIn, A.empty(), nextOut);
      }
   };

   return new Transducer(
      M.map_(XR.makeManagedRef(A.empty<I>()), (state) => (is: O.Option<ReadonlyArray<I>>) =>
         O.fold_(
            is,
            () =>
               T.map_(XR.getAndSet_(state, A.empty()), (leftover) => (!A.isEmpty(leftover) ? [leftover] : A.empty())),
            (in_) => XR.modify_(state, (leftover) => go(in_, leftover, A.empty()))
         )
      )
   );
}

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
            if (acc.has(k)) return Map.unsafeInsertAt_(acc, k, merge(acc.get(k) as I, i));
            else return Map.unsafeInsertAt_(acc, k, i);
         }
      ),
      filter(not(Map.isEmpty))
   );
}

export function collectAllToSetN<I>(E: Eq.Eq<I>): (n: number) => Transducer<unknown, never, I, ReadonlySet<I>> {
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

export function collectAllWhile<I>(p: Predicate<I>): Transducer<unknown, never, I, ReadonlyArray<I>> {
   return pipe(
      fold<I, [ReadonlyArray<I>, boolean]>([A.empty(), true], Tup.snd, ([is, _], i) =>
         p(i) ? [A.append_(is, i), true] : [is, false]
      ),
      map(Tup.fst),
      filter(A.isNonEmpty)
   );
}

export function collectAllWhileM<R, E, I>(p: (i: I) => T.Task<R, E, boolean>): Transducer<R, E, I, ReadonlyArray<I>> {
   return pipe(
      foldM<R, E, I, [ReadonlyArray<I>, boolean]>([A.empty(), true], Tup.snd, ([is, _], i) =>
         T.map_(p(i), (b) => (b ? [A.append_(is, i), true] : [is, false]))
      ),
      map(Tup.fst),
      filter(A.isNonEmpty)
   );
}
