import type { Either } from "../Either";
import { identity } from "../Function";
import { NoSuchElementException } from "../GlobalExceptions";
import type { Has, Tag } from "../Has";
import type { Option } from "../Option";
import type { _E, _R } from "../support/utils";
import { isEither, isOption, isTag } from "../support/utils";
import { fromEither, fromOption, succeed, suspend } from "./constructors";
import type { Sync } from "./model";
import { chain_ } from "./monad";
import { asksService } from "./service";

export class GenSync<R, E, A> {
   readonly _R!: (_: R) => void;
   readonly _E!: () => E;
   readonly _A!: () => A;

   constructor(readonly S: Sync<R, E, A>) {}

   *[Symbol.iterator](): Generator<GenSync<R, E, A>, A, any> {
      return yield this;
   }
}

const adapter = (_: any, __?: any) => {
   if (isEither(_)) {
      return new GenSync(fromEither(_));
   }
   if (isOption(_)) {
      return new GenSync(fromOption(_, () => (__ ? __() : new NoSuchElementException("Sync.gen"))));
   }
   if (isTag(_)) {
      return new GenSync(asksService(_)(identity));
   }
   return new GenSync(_);
};

export function gen<R0, E0, A0>(): <T extends GenSync<R0, E0, any>>(
   f: (i: {
      <A>(_: Tag<A>): GenSync<Has<A>, never, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenSync<unknown, E, A>;
      <A>(_: Option<A>): GenSync<unknown, NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenSync<unknown, E, A>;
      <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>;
   }) => Generator<T, A0, any>
) => Sync<_R<T>, _E<T>, A0>;
export function gen<E0, A0>(): <T extends GenSync<any, E0, any>>(
   f: (i: {
      <A>(_: Tag<A>): GenSync<Has<A>, never, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenSync<unknown, E, A>;
      <A>(_: Option<A>): GenSync<unknown, NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenSync<unknown, E, A>;
      <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>;
   }) => Generator<T, A0, any>
) => Sync<_R<T>, _E<T>, A0>;
export function gen<A0>(): <T extends GenSync<any, any, any>>(
   f: (i: {
      <A>(_: Tag<A>): GenSync<Has<A>, never, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenSync<unknown, E, A>;
      <A>(_: Option<A>): GenSync<unknown, NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenSync<unknown, E, A>;
      <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>;
   }) => Generator<T, A0, any>
) => Sync<_R<T>, _E<T>, A0>;
export function gen<T extends GenSync<any, any, any>, A>(
   f: (i: {
      <A>(_: Tag<A>): GenSync<Has<A>, never, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenSync<unknown, E, A>;
      <A>(_: Option<A>): GenSync<unknown, NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenSync<unknown, E, A>;
      <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>;
   }) => Generator<T, A, any>
): Sync<_R<T>, _E<T>, A>;
export function gen(...args: any[]): any {
   const _gen = <T extends GenSync<any, any, any>, A>(f: (i: any) => Generator<T, A, any>): Sync<_R<T>, _E<T>, A> =>
      suspend(() => {
         const iterator = f(adapter as any);
         const state = iterator.next();

         const run = (state: IteratorYieldResult<T> | IteratorReturnResult<A>): Sync<any, any, A> => {
            if (state.done) {
               return succeed(state.value);
            }
            return chain_(state.value.S, (v) => {
               const next = iterator.next(v);
               return run(next);
            });
         };

         return run(state);
      });

   if (args.length === 0) {
      return (f: any) => _gen(f);
   }

   return _gen(args[0]);
}
