import * as E from "../Either";
import type { IO } from "../IO";
import * as I from "../IO";
import type { IOEither } from "./model";

/*
 * -------------------------------------------
 * IOEither Destructors
 * -------------------------------------------
 */

export const fold_ = <E, A, B, C>(ma: IOEither<E, A>, onLeft: (e: E) => IO<B>, onRight: (a: A) => IO<C>): IO<B | C> =>
   I.chain_(ma, (pab): IO<B | C> => E.fold_(pab, onLeft, onRight));

export const fold = <E, A, B, C>(onLeft: (e: E) => IO<B>, onRight: (a: A) => IO<C>) => (ma: IOEither<E, A>) =>
   fold_(ma, onLeft, onRight);

export const getOrElse_ = <E, A, B>(ma: IOEither<E, A>, onLeft: (e: E) => IO<B>): IO<A | B> =>
   I.chain_(ma, (pab): IO<A | B> => E.fold_(pab, onLeft, I.pure));

export const getOrElse = <E, B>(onLeft: (e: E) => IO<B>) => <A>(ma: IOEither<E, A>): IO<A | B> =>
   getOrElse_(ma, onLeft);
