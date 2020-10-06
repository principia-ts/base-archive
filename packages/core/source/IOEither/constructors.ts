import type { Either } from "../Either";
import * as E from "../Either";
import { flow, FunctionN, Lazy } from "../Function";
import type { IO } from "../IO";
import * as I from "../IO";
import type { IOEither } from "./IOEither";

/*
 * -------------------------------------------
 * IOEither Constructors
 * -------------------------------------------
 */

export const left: <E = never, A = never>(e: E) => IOEither<E, A> = flow(E.left, I.pure);

export const right: <E = never, A = never>(a: A) => IOEither<E, A> = flow(E.right, I.pure);

export const leftIO: <E = never, A = never>(io: IO<E>) => IOEither<E, A> = I.map(E.left);

export const rightIO: <E = never, A = never>(io: IO<A>) => IOEither<E, A> = I.map(E.right);

export const fromEither: <E, A>(pab: Either<E, A>) => IOEither<E, A> = I.pure;

export const _partial = <E, A>(thunk: Lazy<A>, onThrow: (reason: unknown) => E): IOEither<E, A> => () =>
   E._partial(thunk, onThrow);

export const partial = <E>(onThrow: (reason: unknown) => E) => <A>(thunk: Lazy<A>) => _partial(thunk, onThrow);

export const _partialK = <A extends ReadonlyArray<unknown>, B, E>(
   f: FunctionN<A, B>,
   onThrow: (reason: unknown) => E
): ((...args: A) => IOEither<E, B>) => (...a) => _partial(() => f(...a), onThrow);

export const partialK = <E>(onThrow: (reason: unknown) => E) => <A extends ReadonlyArray<unknown>, B>(
   f: FunctionN<A, B>
) => _partialK(f, onThrow);
