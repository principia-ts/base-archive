import { NoSuchElementException } from "../GlobalExceptions";
import type { Option } from "../Option";
import type { _E } from "../support/utils";
import { isOption, isSync } from "../support/utils";
import type { Sync } from "../Sync";
import { runEither, runEitherEnv_ } from "../XPure/run";
import { fromOption_, right } from "./constructors";
import type { Either } from "./model";
import { chain_ } from "./monad";

export class GenEither<E, A> {
   readonly _E!: () => E;
   readonly _A!: () => A;

   constructor(readonly E: Either<E, A>) {}

   *[Symbol.iterator](): Generator<GenEither<E, A>, A, any> {
      return yield this;
   }
}

const adapter = (_: any, __?: any) => {
   if (isSync(_)) {
      return __ ? new GenEither(runEitherEnv_(_, __)) : new GenEither(runEither(_));
   }
   if (isOption(_)) {
      return new GenEither(fromOption_(_, () => (__ ? __() : new NoSuchElementException("Either.gen"))));
   }
   return new GenEither(_);
};

export function gen<E0, A0>(): <T extends GenEither<E0, any>>(
   f: (i: {
      <E, A>(_: Sync<unknown, E, A>): GenEither<E, A>;
      <R, E, A>(_: Sync<R, E, A>, r: R): GenEither<E, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenEither<E, A>;
      <A>(_: Option<A>): GenEither<NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenEither<E, A>;
   }) => Generator<T, A0, any>
) => Either<_E<T>, A0>;
export function gen<A0>(): <T extends GenEither<any, any>>(
   f: (i: {
      <E, A>(_: Sync<unknown, E, A>): GenEither<E, A>;
      <R, E, A>(_: Sync<R, E, A>, r: R): GenEither<E, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenEither<E, A>;
      <A>(_: Option<A>): GenEither<NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenEither<E, A>;
   }) => Generator<T, A0, any>
) => Either<_E<T>, A0>;
export function gen<T extends GenEither<any, any>, A>(
   f: (i: {
      <E, A>(_: Sync<unknown, E, A>): GenEither<E, A>;
      <R, E, A>(_: Sync<R, E, A>, r: R): GenEither<E, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenEither<E, A>;
      <A>(_: Option<A>): GenEither<NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenEither<E, A>;
   }) => Generator<T, A, any>
): Either<_E<T>, A>;
export function gen(...args: any[]): any {
   function gen_<Eff extends GenEither<any, any>, AEff>(
      f: (i: any) => Generator<Eff, AEff, any>
   ): Either<_E<Eff>, AEff> {
      const iterator = f(adapter as any);
      const state = iterator.next();

      function run(state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>): Either<any, AEff> {
         if (state.done) {
            return right(state.value);
         }
         return chain_(state.value.E, (val) => {
            const next = iterator.next(val);
            return run(next);
         });
      }

      return run(state);
   }

   if (args.length === 0) {
      return (f: any) => gen_(f);
   }
   return gen_(args[0]);
}
