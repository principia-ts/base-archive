import type { Either } from "../Either";
import * as E from "../Either";

import { FunctionN, Lazy, pipe, Predicate, Refinement } from "../Function";
import type { IO } from "../IO";
import * as I from "../IO";
import { Maybe } from "../Maybe";
import type * as TC from "../typeclass-index";
import { fromEither, left, right } from "./constructors";
import type { IOEither } from "./IOEither";
import { _chain } from "./methods";

/*
 * -------------------------------------------
 * IOEither Combinators
 * -------------------------------------------
 */

export const _orElse = <E, A, M>(
   ma: IOEither<E, A>,
   onLeft: (e: E) => IOEither<M, A>
): IOEither<M, A> => I._chain(ma, E.fold(onLeft, right));

export const orElse = <E, A, M>(onLeft: (e: E) => IOEither<M, A>) => (ma: IOEither<E, A>) =>
   _orElse(ma, onLeft);

export const _filterOrElse: {
   <E, A, E1, B extends A>(
      ma: IOEither<E, A>,
      refinement: Refinement<A, B>,
      onFalse: (a: A) => E1
   ): IOEither<E | E1, B>;
   <E, A, E1>(ma: IOEither<E, A>, predicate: Predicate<A>, onFalse: (a: A) => E1): IOEither<
      E | E1,
      A
   >;
} = <E, A, E1>(
   ma: IOEither<E, A>,
   predicate: Predicate<A>,
   onFalse: (a: A) => E1
): IOEither<E | E1, A> => _chain(ma, (a) => (predicate(a) ? right(a) : left(onFalse(a))));

export const filterOrElse: {
   <E, A, E1, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E1): (
      ma: IOEither<E, A>
   ) => IOEither<E | E1, B>;
   <E, A, E1>(predicate: Predicate<A>, onFalse: (a: A) => E1): (
      ma: IOEither<E, A>
   ) => IOEither<E | E1, A>;
} = <E, A, E1>(predicate: Predicate<A>, onFalse: (a: A) => E1) => (ma: IOEither<E, A>) =>
   _filterOrElse(ma, predicate, onFalse);

export const fromEitherK = <A extends ReadonlyArray<unknown>, E, B>(
   f: FunctionN<A, Either<E, B>>
): ((...args: A) => IOEither<E, B>) => (...a) => fromEither(f(...a));

export const _chainEitherK = <E, A, E1, B>(ma: IOEither<E, A>, f: (a: A) => Either<E1, B>) =>
   _chain(ma, fromEitherK(f));

export const chainEitherK = <A, E1, B>(f: (a: A) => Either<E1, B>) => <E>(ma: IOEither<E, A>) =>
   _chainEitherK(ma, f);

export const _fromMaybe = <E, A>(ma: Maybe<A>, onNone: Lazy<E>): IOEither<E, A> =>
   ma._tag === "Nothing" ? left(onNone()) : right(ma.value);

export const fromMaybe = <E>(onNone: Lazy<E>) => <A>(ma: Maybe<A>) => _fromMaybe(ma, onNone);
