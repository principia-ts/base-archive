import type { Either } from "../Either";
import * as E from "../Either";
import type { FunctionN, Lazy, Predicate, Refinement } from "../Function";
import * as I from "../IO";
import type { Option } from "../Option";
import { fromEither, left, right } from "./constructors";
import { chain_ } from "./methods";
import type { IOEither } from "./model";

/*
 * -------------------------------------------
 * IOEither Combinators
 * -------------------------------------------
 */

export const orElse_ = <E, A, M>(ma: IOEither<E, A>, onLeft: (e: E) => IOEither<M, A>): IOEither<M, A> =>
   I.chain_(ma, E.fold(onLeft, right));

export const orElse = <E, A, M>(onLeft: (e: E) => IOEither<M, A>) => (ma: IOEither<E, A>) => orElse_(ma, onLeft);

export const filterOrElse_: {
   <E, A, E1, B extends A>(ma: IOEither<E, A>, refinement: Refinement<A, B>, onFalse: (a: A) => E1): IOEither<
      E | E1,
      B
   >;
   <E, A, E1>(ma: IOEither<E, A>, predicate: Predicate<A>, onFalse: (a: A) => E1): IOEither<E | E1, A>;
} = <E, A, E1>(ma: IOEither<E, A>, predicate: Predicate<A>, onFalse: (a: A) => E1): IOEither<E | E1, A> =>
   chain_(ma, (a) => (predicate(a) ? right(a) : left(onFalse(a))));

export const filterOrElse: {
   <E, A, E1, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E1): (
      ma: IOEither<E, A>
   ) => IOEither<E | E1, B>;
   <E, A, E1>(predicate: Predicate<A>, onFalse: (a: A) => E1): (ma: IOEither<E, A>) => IOEither<E | E1, A>;
} = <E, A, E1>(predicate: Predicate<A>, onFalse: (a: A) => E1) => (ma: IOEither<E, A>) =>
   filterOrElse_(ma, predicate, onFalse);

export const fromEitherK = <A extends ReadonlyArray<unknown>, E, B>(
   f: FunctionN<A, Either<E, B>>
): ((...args: A) => IOEither<E, B>) => (...a) => fromEither(f(...a));

export const chainEitherK_ = <E, A, E1, B>(ma: IOEither<E, A>, f: (a: A) => Either<E1, B>) =>
   chain_(ma, fromEitherK(f));

export const chainEitherK = <A, E1, B>(f: (a: A) => Either<E1, B>) => <E>(ma: IOEither<E, A>) => chainEitherK_(ma, f);

export const fromOption_ = <E, A>(ma: Option<A>, onNone: Lazy<E>): IOEither<E, A> =>
   ma._tag === "None" ? left(onNone()) : right(ma.value);

export const fromOption = <E>(onNone: Lazy<E>) => <A>(ma: Option<A>) => fromOption_(ma, onNone);
