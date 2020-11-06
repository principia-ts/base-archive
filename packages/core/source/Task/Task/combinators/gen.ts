import { chain_, fail, fromEither, local_, map_, pure, suspend, unit } from "../_core";
import type { Either } from "../../../Either";
import { tuple } from "../../../Function";
import type { NoSuchElementException } from "../../../GlobalExceptions";
import type { Has, Tag } from "../../../Has";
import type { Option } from "../../../Option";
import type { _E, _R } from "../../../support/utils";
import { isEither, isOption, isTag } from "../../../support/utils";
import { sequential } from "../../ExecutionStrategy";
import type { ReleaseMap } from "../../Managed";
import { releaseAll } from "../../Managed/combinators/releaseAll";
import { Managed } from "../../Managed/model";
import { makeReleaseMap } from "../../Managed/ReleaseMap";
import type { Task } from "../model";
import { bracketExit_ } from "./bracket";
import { getOrFail } from "./getOrFail";
import { askService } from "./service";

export class GenTask<R, E, A> {
   readonly _R!: (_R: R) => void;
   readonly _E!: () => E;
   readonly _A!: () => A;

   constructor(readonly T: Task<R, E, A> | Managed<R, E, A>) {}

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

export function gen<R0, E0, A0>(): <T extends GenTask<R0, E0, any>>(
   f: (i: {
      <A>(_: Tag<A>): GenTask<Has<A>, never, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenTask<unknown, E, A>;
      <A>(_: Option<A>): GenTask<unknown, NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenTask<unknown, E, A>;
      <R, E, A>(_: Task<R, E, A>): GenTask<R, E, A>;
      <R, E, A>(_: Managed<R, E, A>): GenTask<R, E, A>;
   }) => Generator<T, A0, any>
) => Task<_R<T>, _E<T>, A0>;
export function gen<E0, A0>(): <T extends GenTask<any, E0, any>>(
   f: (i: {
      <A>(_: Tag<A>): GenTask<Has<A>, never, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenTask<unknown, E, A>;
      <A>(_: Option<A>): GenTask<unknown, NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenTask<unknown, E, A>;
      <R, E, A>(_: Task<R, E, A>): GenTask<R, E, A>;
      <R, E, A>(_: Managed<R, E, A>): GenTask<R, E, A>;
   }) => Generator<T, A0, any>
) => Task<_R<T>, _E<T>, A0>;
export function gen<A0>(): <T extends GenTask<any, any, any>>(
   f: (i: {
      <A>(_: Tag<A>): GenTask<Has<A>, never, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenTask<unknown, E, A>;
      <A>(_: Option<A>): GenTask<unknown, NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenTask<unknown, E, A>;
      <R, E, A>(_: Task<R, E, A>): GenTask<R, E, A>;
      <R, E, A>(_: Managed<R, E, A>): GenTask<R, E, A>;
   }) => Generator<T, A0, any>
) => Task<_R<T>, _E<T>, A0>;
export function gen<T extends GenTask<any, any, any>, A>(
   f: (i: {
      <A>(_: Tag<A>): GenTask<Has<A>, never, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenTask<unknown, E, A>;
      <A>(_: Option<A>): GenTask<unknown, NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenTask<unknown, E, A>;
      <R, E, A>(_: Task<R, E, A>): GenTask<R, E, A>;
      <R, E, A>(_: Managed<R, E, A>): GenTask<R, E, A>;
   }) => Generator<T, A, any>
): Task<_R<T>, _E<T>, A>;
export function gen(...args: any[]): any {
   const _gen = <T extends GenTask<any, any, any>, A>(f: (i: any) => Generator<T, A, any>): Task<_R<T>, _E<T>, A> =>
      suspend(() => {
         const iterator = f(adapter as any);
         const state = iterator.next();

         const run = (rm: ReleaseMap, state: IteratorYieldResult<T> | IteratorReturnResult<A>): Task<any, any, A> => {
            if (state.done) {
               return pure(state.value);
            }
            return chain_(
               state.value.T instanceof Managed
                  ? map_(
                       local_(state.value.T.task, (r0) => tuple(r0, rm)),
                       ([_, a]) => a
                    )
                  : state.value.T,
               (val) => {
                  const next = iterator.next(val);
                  return run(rm, next);
               }
            );
         };

         return chain_(makeReleaseMap, (rm) =>
            bracketExit_(
               unit(),
               () => run(rm, state),
               (_, e) => releaseAll(e, sequential())(rm)
            )
         );
      });
   if (args.length === 0) {
      return (f: any) => _gen(f);
   }
   return _gen(args[0]);
}
