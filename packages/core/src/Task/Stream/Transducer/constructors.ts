import type { Predicate } from "../../../Function";
import { pipe, tuple } from "../../../Function";
import * as L from "../../../List";
import * as O from "../../../Option";
import * as Tup from "../../../Tuple";
import * as Ex from "../../Exit";
import * as M from "../../Managed";
import type { Finalizer } from "../../Managed/ReleaseMap";
import * as T from "../../Task";
import * as XR from "../../XRef";
import * as XRM from "../../XRefM";
import { map, map_, mapM_ } from "./functor";
import { Transducer } from "./model";

export function fail<E>(e: E): Transducer<unknown, E, unknown, never> {
   return new Transducer(M.succeed((_) => T.fail(e)));
}

export function die(error: unknown): Transducer<unknown, never, unknown, never> {
   return new Transducer(M.succeed((_) => T.die(error)));
}

export function identity<I>(): Transducer<unknown, never, I, I> {
   return fromPush(O.fold(() => T.succeed(L.empty()), T.succeed));
}

export function fromPush<R, E, I, O>(
   push: (input: O.Option<L.List<I>>) => T.Task<R, E, L.List<O>>
): Transducer<R, E, I, O> {
   return new Transducer(M.succeed(push));
}

export function fromTask<R, E, A>(task: T.Task<R, E, A>): Transducer<R, E, unknown, A> {
   return new Transducer(M.succeed((_: any) => T.map_(task, L.list)));
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

export function prepend<O>(values: L.List<O>): Transducer<unknown, never, O, O> {
   return new Transducer(
      M.map_(XR.makeManagedRef(values), (state) => (is: O.Option<L.List<O>>) =>
         O.fold_(
            is,
            () => XR.getAndSet_(state, L.empty()),
            (xs) =>
               pipe(
                  state,
                  XR.getAndSet(L.empty()),
                  T.map((c) => (L.isEmpty(c) ? xs : L.concat_(c, xs)))
               )
         )
      )
   );
}

export function branchAfter<R, E, I, O>(
   n: number,
   f: (c: L.List<I>) => Transducer<R, E, I, O>
): Transducer<R, E, I, O> {
   interface Collecting {
      _tag: "Collecting";
      data: L.List<I>;
   }
   interface Emitting {
      _tag: "Emitting";
      finalizer: Finalizer;
      push: (is: O.Option<L.List<I>>) => T.Task<R, E, L.List<O>>;
   }
   type State = Collecting | Emitting;
   const initialState: State = {
      _tag: "Collecting",
      data: L.empty()
   };

   const toCollect = Math.max(0, n);

   return new Transducer(
      M.chain_(M.scope(), (scope) =>
         M.map_(XRM.makeManagedRefM<State>(initialState), (state) => (is: O.Option<L.List<I>>) =>
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
                           if (L.isEmpty(data)) {
                              return T.succeed([L.empty<O>(), s] as const);
                           } else {
                              const remaining = toCollect - s.data.length;
                              if (remaining <= data.length) {
                                 const [newCollected, remainder] = L.splitAt(remaining)(data);
                                 return T.chain_(
                                    scope.apply(f(L.concat_(s.data, newCollected)).push),
                                    ([finalizer, push]) =>
                                       T.map_(
                                          push(O.some(remainder)),
                                          (_) => [_, { _tag: "Emitting", finalizer, push }] as const
                                       )
                                 );
                              } else {
                                 return T.succeed([
                                    L.empty<O>(),
                                    { _tag: "Collecting", data: L.concat_(s.data, data) }
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
      M.gen(function* (_) {
         const dropping = yield* _(XR.makeManagedRef(true));
         return (is: O.Option<L.List<I>>) =>
            O.fold_(
               is,
               () => T.succeed(L.empty()),
               (is) =>
                  XR.modify_(dropping, (b) => {
                     switch (b) {
                        case true: {
                           const is1 = L.dropWhile_(is, predicate);
                           return [is1, is1.length === 0];
                        }
                        case false: {
                           return [is, false];
                        }
                     }
                  })
            );
      })
   );
}

export function fold<I, O>(
   initial: O,
   cont: (o: O) => boolean,
   f: (output: O, input: I) => O
): Transducer<unknown, never, I, O> {
   const go = (in_: L.List<I>, state: O, progress: boolean): readonly [L.List<O>, O, boolean] => {
      return pipe(
         in_,
         L.reduce([L.empty<O>(), state, progress] as const, ([os0, state, _], i) => {
            const o = f(state, i);
            if (cont(o)) {
               return [os0, o, true] as const;
            } else {
               return [L.append_(os0, o), initial, false] as const;
            }
         })
      );
   };
   return new Transducer(
      M.map_(XR.makeManagedRef(O.some(initial)), (state) => (is: O.Option<L.List<I>>) =>
         O.fold_(
            is,
            () => pipe(XR.getAndSet_(state, O.none()), T.map(O.fold(() => L.empty(), L.list))),
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
   const go = (in_: L.List<I>, state: O, progress: boolean): T.Task<R, E, readonly [L.List<O>, O, boolean]> =>
      L.reduce_(
         in_,
         T.succeed([L.empty(), state, progress]) as T.Task<R, E, readonly [L.List<O>, O, boolean]>,
         (b, i) =>
            T.chain_(b, ([os0, state, _]) =>
               T.map_(f(state, i), (o) => {
                  if (cont(o)) {
                     return [os0, o, true] as const;
                  } else {
                     return [L.append_(os0, o), initial, false] as const;
                  }
               })
            )
      );
   return new Transducer(
      M.map_(XR.makeManagedRef(init), (state) => (is: O.Option<L.List<I>>) =>
         O.fold_(
            is,
            () => pipe(state, XR.getAndSet(O.none()), T.map(O.fold(() => L.empty(), L.list))),
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
   decompose: (input: I) => L.List<I>,
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
      in_: L.List<I>,
      os0: L.List<O>,
      state: FoldWeightedState,
      dirty: boolean
   ): readonly [L.List<O>, FoldWeightedState, boolean] =>
      L.reduce_(in_, [os0, state, dirty] as const, ([os0, state, _], i) => {
         const total = state.cost + cost(state.result, i);

         if (total > max) {
            const is = decompose(i);
            if (is.length <= 1 && !dirty) {
               return [
                  L.append_(os0, f(state.result, !L.isEmpty(is) ? (L.unsafeFirst(is) as I) : i)),
                  initialState,
                  false
               ] as const;
            } else if (is.length <= 1 && dirty) {
               const elem = !L.isEmpty(is) ? (L.unsafeFirst(is) as I) : i;
               return [
                  L.append_(os0, state.result),
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
      M.map_(XR.makeManagedRef(O.some(initialState)), (state) => (is: O.Option<L.List<I>>) =>
         O.fold_(
            is,
            () =>
               pipe(
                  state,
                  XR.getAndSet(O.none()),
                  T.map(
                     O.fold(
                        () => L.empty(),
                        (s) => L.list(s.result)
                     )
                  )
               ),
            (in_) =>
               XR.modify_(state, (s) => {
                  const [o, s2, dirty] = go(
                     in_,
                     L.empty(),
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
   decompose: (input: I) => T.Task<R, E, L.List<I>>,
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
      in_: L.List<I>,
      os: L.List<O>,
      state: FoldWeightedState,
      dirty: boolean
   ): T.Task<R, E, readonly [L.List<O>, FoldWeightedState, boolean]> =>
      L.reduce_(
         in_,
         T.succeed([os, state, dirty]) as T.Task<R, E, readonly [L.List<O>, FoldWeightedState, boolean]>,
         (o, i) =>
            T.chain_(o, ([os, state, _]) =>
               T.chain_(costFn(state.result, i), (cost) => {
                  const total = cost + state.cost;
                  if (total > max) {
                     return T.chain_(decompose(i), (is) => {
                        if (is.length <= 1 && !dirty) {
                           return T.map_(
                              f(state.result, !L.isEmpty(is) ? (L.unsafeFirst(is) as I) : i),
                              (o) => [L.append_(os, o), initialState, false] as const
                           );
                        } else if (is.length <= 1 && dirty) {
                           const elem = !L.isEmpty(is) ? (L.unsafeFirst(is) as I) : i;
                           return T.mapBoth_(
                              f(initialState.result, elem),
                              costFn(initialState.result, elem),
                              (result, cost) => [L.append_(os, state.result), { result, cost }, true]
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
      M.map_(XR.makeManagedRef(O.some(initialState)), (state) => (is: O.Option<L.List<I>>) =>
         O.fold_(
            is,
            () =>
               pipe(
                  state,
                  XR.getAndSet(O.none()),
                  T.map(
                     O.fold(
                        () => L.empty(),
                        (s) => L.list(s.result)
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
                        L.empty(),
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
