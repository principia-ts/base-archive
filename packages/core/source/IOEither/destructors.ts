import * as E from "../Either";
import type { IO } from "../IO";
import * as I from "../IO";
import type { IOEither } from "./IOEither";

/*
 * -------------------------------------------
 * IOEither Destructors
 * -------------------------------------------
 */

export const _fold = <E, A, B, C>(
   ma: IOEither<E, A>,
   onLeft: (e: E) => IO<B>,
   onRight: (a: A) => IO<C>
): IO<B | C> => I._chain(ma, (pab): IO<B | C> => E._fold(pab, onLeft, onRight));

export const fold = <E, A, B, C>(onLeft: (e: E) => IO<B>, onRight: (a: A) => IO<C>) => (
   ma: IOEither<E, A>
) => _fold(ma, onLeft, onRight);

export const _getOrElse = <E, A, B>(ma: IOEither<E, A>, onLeft: (e: E) => IO<B>): IO<A | B> =>
   I._chain(ma, (pab): IO<A | B> => E._fold(pab, onLeft, I.pure));

export const getOrElse = <E, B>(onLeft: (e: E) => IO<B>) => <A>(ma: IOEither<E, A>): IO<A | B> =>
   _getOrElse(ma, onLeft);
