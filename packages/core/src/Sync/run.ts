import type { Either } from "../Either";
import * as X from "../SIO";
import type { Sync } from "./model";

/*
 * -------------------------------------------
 * Run Sync
 * -------------------------------------------
 */

export const runEither: <E, A>(sync: Sync<unknown, E, A>) => Either<E, A> = X.runEither;

export const runEitherEnv_: <R, E, A>(sync: Sync<R, E, A>, env: R) => Either<E, A> =
  X.runEitherEnv_;

export const runEitherEnv: <R>(env: R) => <E, A>(sync: Sync<R, E, A>) => Either<E, A> =
  X.runEitherEnv;

export const runIO: <A>(sync: Sync<unknown, never, A>) => A = X.runIO;
