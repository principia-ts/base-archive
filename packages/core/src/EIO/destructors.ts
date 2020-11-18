import type { IO } from "../IO";
import { foldM_ } from "./combinators";
import { succeed } from "./constructors";
import type { EIO } from "./model";

/*
 * -------------------------------------------
 * EIO Destructors
 * -------------------------------------------
 */

export function getOrElse_<E, A, B>(ma: EIO<E, A>, onLeft: (e: E) => IO<B>): IO<A | B> {
  return foldM_(ma, onLeft, succeed);
}

export function getOrElse<E, B>(onLeft: (e: E) => IO<B>): <A>(ma: EIO<E, A>) => IO<B | A> {
  return (ma) => getOrElse_(ma, onLeft);
}
