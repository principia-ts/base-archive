import type { Either } from "../../../Either";
import { tuple } from "../../../Function";
import type { NoSuchElementException } from "../../../GlobalExceptions";
import type { Option } from "../../../Option";
import type { _E, _R } from "../../../support/utils";
import { isEither, isManaged, isOption, isTag } from "../../../support/utils";
import { sequential } from "../../ExecutionStrategy";
import type { Has, Tag } from "../../Has";
import type { Managed, ReleaseMap } from "../../Managed";
import { makeReleaseMap, releaseAll } from "../../Managed";
import { chain_, fail, fromEither, local_, map_, pure, unit } from "../core";
import type { Task } from "../model";
import { bracketExit_ } from "./bracket";
import { getOrFail } from "./getOrFail";
import { askService } from "./service";

export class GenTask<R, E, A> {
   readonly _R!: (_R: R) => void;
   readonly _E!: () => E;
   readonly _A!: () => A;

   constructor(readonly ma: Task<R, E, A> | Managed<R, E, A>) {}

   *[Symbol.iterator](): Generator<GenTask<R, E, A>, A, any> {
      return yield this;
   }
}

const adapter = (_: any, __?: any) => {
   if (isEither(_)) {
      return new GenTask(fromEither(() => _));
   }
   if (isOption(_)) {
      return new GenTask(__ ? (_._tag === "None" ? fail(__()) : pure(_.value)) : getOrFail(_));
   }
   if (isTag(_)) {
      return new GenTask(askService(_));
   }
   return new GenTask(_);
};

export const gen = <T extends GenTask<any, any, any>, A>(
   f: (i: {
      <A>(_: Tag<A>): GenTask<Has<A>, never, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenTask<unknown, E, A>;
      <A>(_: Option<A>): GenTask<unknown, NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenTask<unknown, E, A>;
      <R, E, A>(_: Task<R, E, A>): GenTask<R, E, A>;
      <R, E, A>(_: Managed<R, E, A>): GenTask<R, E, A>;
   }) => Generator<T, A, any>
): Task<_R<T>, _E<T>, A> => {
   const iterator = f(adapter as any);
   const state = iterator.next();

   const run = (rm: ReleaseMap, state: IteratorYieldResult<T> | IteratorReturnResult<A>): Task<any, any, A> => {
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
