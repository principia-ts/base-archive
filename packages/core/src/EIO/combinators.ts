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

export function fold_<E, A, B, C>(ma: EIO<E, A>, onFailure: (e: E) => IO<B>, onSuccess: (a: A) => IO<C>): IO<B | C> {
   return foldM_(ma, onFailure, onSuccess);
}

export function fold<E, A, B, C>(onLeft: (e: E) => IO<B>, onRight: (a: A) => IO<C>): (ma: EIO<E, A>) => IO<B | C> {
   return (ma) => fold_(ma, onLeft, onRight);
}

export const orElse_: <E, A, M>(ma: EIO<E, A>, onLeft: (e: E) => EIO<M, A>) => EIO<M, A> = X.orElse_;

export function orElse<E, A, M>(onLeft: (e: E) => EIO<M, A>) {
   return (ma: EIO<E, A>): EIO<M, A> => orElse_(ma, onLeft);
}

export function filterOrElse_<E, A, E1, B extends A>(
   ma: EIO<E, A>,
   refinement: Refinement<A, B>,
   onFalse: (a: A) => E1
): EIO<E | E1, B>;
export function filterOrElse_<E, A, E1>(ma: EIO<E, A>, predicate: Predicate<A>, onFalse: (a: A) => E1): EIO<E | E1, A>;
export function filterOrElse_<E, A, E1>(ma: EIO<E, A>, predicate: Predicate<A>, onFalse: (a: A) => E1): EIO<E | E1, A> {
   return chain_(ma, (a) => (predicate(a) ? succeed(a) : fail(onFalse(a))));
}

export function filterOrElse<E, A, E1, B extends A>(
   refinement: Refinement<A, B>,
   onFalse: (a: A) => E1
): (ma: EIO<E, A>) => EIO<E | E1, B>;
export function filterOrElse<E, A, E1>(
   predicate: Predicate<A>,
   onFalse: (a: A) => E1
): (ma: EIO<E, A>) => EIO<E | E1, A>;
export function filterOrElse<E, A, E1>(
   predicate: Predicate<A>,
   onFalse: (a: A) => E1
): (ma: EIO<E, A>) => EIO<E | E1, A> {
   return (ma) => filterOrElse_(ma, predicate, onFalse);
}

export function fromEitherK<A extends ReadonlyArray<unknown>, E, B>(
   f: FunctionN<A, Either<E, B>>
): (...args: A) => EIO<E, B> {
   return (...a) => fromEither(f(...a));
}

export function chainEitherK_<E, A, E1, B>(ma: EIO<E, A>, f: (a: A) => Either<E1, B>): EIO<E | E1, B> {
   return chain_(ma, fromEitherK(f));
}

export function chainEitherK<A, E1, B>(f: (a: A) => Either<E1, B>): <E>(ma: EIO<E, A>) => EIO<E1 | E, B> {
   return (ma) => chainEitherK_(ma, f);
}

export function fromOption_<E, A>(ma: Option<A>, onNone: Lazy<E>): EIO<E, A> {
   return ma._tag === "None" ? fail(onNone()) : succeed(ma.value);
}

export function fromOption<E>(onNone: Lazy<E>): <A>(ma: Option<A>) => EIO<E, A> {
   return (ma) => fromOption_(ma, onNone);
}
