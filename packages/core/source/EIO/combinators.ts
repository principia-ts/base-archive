import type { Either } from "../Either";
import type { FunctionN, Lazy, Predicate, Refinement } from "../Function";
import type { Option } from "../Option";
import * as F from "../XPure";
import { fail, fromEither, succeed } from "./constructors";
import { chain_ } from "./methods";
import type { EIO } from "./model";

/*
 * -------------------------------------------
 * EIO Combinators
 * -------------------------------------------
 */

export const orElse_: <E, A, M>(ma: EIO<E, A>, onLeft: (e: E) => EIO<M, A>) => EIO<M, A> = F.orElse_;

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
