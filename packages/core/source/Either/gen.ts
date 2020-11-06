import { genF, GenHKT } from "../DSL/gen";
import { NoSuchElementException } from "../GlobalExceptions";
import type { Option } from "../Option";
import { isOption, isSync } from "../support/utils";
import type { Sync } from "../Sync";
import { runEither, runEitherEnv_ } from "../XPure/run";
import { fromOption_ } from "./constructors";
import type { Either } from "./model";
import { Monad } from "./monad";

const adapter: {
   <E, A>(_: Sync<unknown, E, A>): GenHKT<Either<E, A>, A>;
   <R, E, A>(_: Sync<R, E, A>, env: R): GenHKT<Either<E, A>, A>;
   <E, A>(_: Option<A>, onNone: () => E): GenHKT<Either<E, A>, A>;
   <A>(_: Option<A>): GenHKT<Either<NoSuchElementException, A>, A>;
   <E, A>(_: Either<E, A>): GenHKT<Either<E, A>, A>;
} = (_: any, __?: any) => {
   if (isSync(_)) {
      return __ ? new GenHKT(runEitherEnv_(_, __)) : new GenHKT(runEither(_));
   }
   if (isOption(_)) {
      return new GenHKT(fromOption_(_, () => (__ ? __() : new NoSuchElementException("Either.gen"))));
   }
   return new GenHKT(_);
};

export const gen = genF(Monad, { adapter });
