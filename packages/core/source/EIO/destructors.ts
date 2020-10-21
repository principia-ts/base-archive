import type { IO } from "../IO";
import * as F from "../XPure";
import { succeed } from "./constructors";
import type { EIO } from "./model";

/*
 * -------------------------------------------
 * EIO Destructors
 * -------------------------------------------
 */

export const foldM_: <E, A, E1, B, E2, C>(
   ma: EIO<E, A>,
   onFailure: (e: E) => EIO<E1, B>,
   onSuccess: (a: A) => EIO<E2, C>
) => EIO<E1 | E2, B | C> = F.foldM_;

export const foldM: <E, A, E1, B, E2, C>(
   onFailure: (e: E) => EIO<E1, B>,
   onSuccess: (a: A) => EIO<E2, C>
) => (ma: EIO<E, A>) => EIO<E1 | E2, B | C> = F.foldM;

export const fold_ = <E, A, B, C>(ma: EIO<E, A>, onFailure: (e: E) => IO<B>, onSuccess: (a: A) => IO<C>): IO<B | C> =>
   F.foldM_(ma, onFailure, onSuccess);

export const fold = <E, A, B, C>(onLeft: (e: E) => IO<B>, onRight: (a: A) => IO<C>) => (ma: EIO<E, A>) =>
   fold_(ma, onLeft, onRight);

export const getOrElse_ = <E, A, B>(ma: EIO<E, A>, onLeft: (e: E) => IO<B>): IO<A | B> => F.foldM_(ma, onLeft, succeed);

export const getOrElse = <E, B>(onLeft: (e: E) => IO<B>) => <A>(ma: EIO<E, A>): IO<A | B> => getOrElse_(ma, onLeft);
