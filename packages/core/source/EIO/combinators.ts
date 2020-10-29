import type { Either } from "../Either";
import type { FunctionN, Lazy, Predicate, Refinement } from "../Function";
import type { IO } from "../IO";
import type { Option } from "../Option";
import * as X from "../XPure";
import { fail, fromEither, succeed } from "./constructors";
import type { EIO } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * EIO Combinators
 * -------------------------------------------
 */

export const foldM_: <E, A, E1, B, E2, C>(
   ma: EIO<E, A>,
   onFailure: (e: E) => EIO<E1, B>,
   onSuccess: (a: A) => EIO<E2, C>
) => EIO<E1 | E2, B | C> = X.foldM_;

export const foldM: <E, A, E1, B, E2, C>(
   onFailure: (e: E) => EIO<E1, B>,
   onSuccess: (a: A) => EIO<E2, C>
) => (ma: EIO<E, A>) => EIO<E1 | E2, B | C> = X.foldM;

export const fold_ = <E, A, B, C>(ma: EIO<E, A>, onFailure: (e: E) => IO<B>, onSuccess: (a: A) => IO<C>): IO<B | C> =>
   foldM_(ma, onFailure, onSuccess);

export const fold = <E, A, B, C>(onLeft: (e: E) => IO<B>, onRight: (a: A) => IO<C>) => (ma: EIO<E, A>) =>
   fold_(ma, onLeft, onRight);

export const orElse_: <E, A, M>(ma: EIO<E, A>, onLeft: (e: E) => EIO<M, A>) => EIO<M, A> = X.orElse_;

export const orElse = <E, A, M>(onLeft: (e: E) => EIO<M, A>) => (ma: EIO<E, A>) => orElse_(ma, onLeft);

export const filterOrElse_: {
   <E, A, E1, B extends A>(ma: EIO<E, A>, refinement: Refinement<A, B>, onFalse: (a: A) => E1): EIO<E | E1, B>;
   <E, A, E1>(ma: EIO<E, A>, predicate: Predicate<A>, onFalse: (a: A) => E1): EIO<E | E1, A>;
} = <E, A, E1>(ma: EIO<E, A>, predicate: Predicate<A>, onFalse: (a: A) => E1): EIO<E | E1, A> =>
   chain_(ma, (a) => (predicate(a) ? succeed(a) : fail(onFalse(a))));

export const filterOrElse: {
   <E, A, E1, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E1): (ma: EIO<E, A>) => EIO<E | E1, B>;
   <E, A, E1>(predicate: Predicate<A>, onFalse: (a: A) => E1): (ma: EIO<E, A>) => EIO<E | E1, A>;
} = <E, A, E1>(predicate: Predicate<A>, onFalse: (a: A) => E1) => (ma: EIO<E, A>) =>
   filterOrElse_(ma, predicate, onFalse);

export const fromEitherK = <A extends ReadonlyArray<unknown>, E, B>(
   f: FunctionN<A, Either<E, B>>
): ((...args: A) => EIO<E, B>) => (...a) => fromEither(f(...a));

export const chainEitherK_ = <E, A, E1, B>(ma: EIO<E, A>, f: (a: A) => Either<E1, B>) => chain_(ma, fromEitherK(f));

export const chainEitherK = <A, E1, B>(f: (a: A) => Either<E1, B>) => <E>(ma: EIO<E, A>) => chainEitherK_(ma, f);

export const fromOption_ = <E, A>(ma: Option<A>, onNone: Lazy<E>): EIO<E, A> =>
   ma._tag === "None" ? fail(onNone()) : succeed(ma.value);

export const fromOption = <E>(onNone: Lazy<E>) => <A>(ma: Option<A>) => fromOption_(ma, onNone);
