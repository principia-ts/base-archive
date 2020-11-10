import type { Either } from "../Either";
import * as X from "../XPure";
import type { Sync } from "./model";

/*
 * -------------------------------------------
 * Fallible Sync
 * -------------------------------------------
 */

export const recover: <R, E, A>(fa: Sync<R, E, A>) => Sync<R, never, Either<E, A>> = X.recover;

export const absolve: <R, E, E1, A>(fa: Sync<R, E1, Either<E, A>>) => Sync<R, E | E1, A> = X.absolve;
