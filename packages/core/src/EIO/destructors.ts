import type { IO } from "../IO";
import { foldM_ } from "./combinators";
import { succeed } from "./constructors";
import type { EIO } from "./model";

/*
 * -------------------------------------------
 * EIO Destructors
 * -------------------------------------------
 */

export const getOrElse_ = <E, A, B>(ma: EIO<E, A>, onLeft: (e: E) => IO<B>): IO<A | B> => foldM_(ma, onLeft, succeed);

export const getOrElse = <E, B>(onLeft: (e: E) => IO<B>) => <A>(ma: EIO<E, A>): IO<A | B> => getOrElse_(ma, onLeft);
