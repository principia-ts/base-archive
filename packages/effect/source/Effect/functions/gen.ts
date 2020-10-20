import type { Either } from "@principia/core/Either";
import { tuple } from "@principia/core/Function";
import type { Option } from "@principia/core/Option";

import { sequential } from "../../ExecutionStrategy";
import type { NoSuchElementException } from "../../GlobalExceptions";
import type { Has, Tag } from "../../Has";
import type { Managed, ReleaseMap } from "../../Managed";
import { makeReleaseMap, releaseAll } from "../../Managed";
import type { _E, _R } from "../../Support/utils";
import { isEither, isManaged, isOption, isTag } from "../../Support/utils";
import { chain_, fail, fromEither, local_, map_, pure, unit } from "../core";
import type { Effect } from "../Effect";
import { bracketExit_ } from "./bracket";
import { getOrFail } from "./getOrFail";
import { askService } from "./service";

export interface GenEffect<R, E, A> {
   readonly _R: (_R: R) => void;
   readonly _E: () => E;
   readonly _A: () => A;

   readonly ma: Effect<R, E, A> | Managed<R, E, A>;

   [Symbol.iterator](): Generator<GenEffect<R, E, A>, A, any>;
}

export const GenEffect = <R, E, A>(effect: Effect<R, E, A> | Managed<R, E, A>): GenEffect<R, E, A> => {
   const get: GenEffect<R, E, A> = {
      _R: () => undefined as any,
      _E: () => undefined as any,
      _A: () => undefined as any,
      ma: effect,
      *[Symbol.iterator]() {
         return yield get;
      }
   };
   return get;
};

const adapter = (_: any, __?: any) => {
   if (isEither(_)) {
      return GenEffect(fromEither(() => _));
   }
   if (isOption(_)) {
      return GenEffect(__ ? (_._tag === "None" ? fail(__()) : pure(_.value)) : getOrFail(_));
   }
   if (isTag(_)) {
      return GenEffect(askService(_));
   }
   return GenEffect(_);
};

export const gen = <T extends GenEffect<any, any, any>, A>(
   f: (i: {
      <A>(_: Tag<A>): GenEffect<Has<A>, never, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenEffect<unknown, E, A>;
      <A>(_: Option<A>): GenEffect<unknown, NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenEffect<unknown, E, A>;
      <R, E, A>(_: Effect<R, E, A>): GenEffect<R, E, A>;
      <R, E, A>(_: Managed<R, E, A>): GenEffect<R, E, A>;
   }) => Generator<T, A, any>
): Effect<_R<T>, _E<T>, A> => {
   const iterator = f(adapter as any);
   const state = iterator.next();

   const run = (rm: ReleaseMap, state: IteratorYieldResult<T> | IteratorReturnResult<A>): Effect<any, any, A> => {
      if (state.done) {
         return pure(state.value);
      }
      return chain_(
         isManaged(state.value["ma"])
            ? map_(
                 local_(state.value.ma.effect, (r0) => tuple(r0, rm)),
                 ([_, a]) => a
              )
            : state.value.ma,
         (val) => {
            const next = iterator.next(val);
            return run(rm, next);
         }
      );
   };

   return chain_(makeReleaseMap, (rm) =>
      bracketExit_(
         unit,
         () => run(rm, state),
         (_, e) => releaseAll(e, sequential())(rm)
      )
   );
};
