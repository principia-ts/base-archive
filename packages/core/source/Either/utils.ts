import { identity } from "../Function";
import type { Either } from "./model";

/**
 * Compact type Either<E, A> | Either<E1, B> to Either<E | E1, A | B>
 */
export const deunion: <T extends Either<any, any>>(
   fa: T
) => [T] extends [Either<infer E, infer A>] ? Either<E, A> : T = identity as any;

export const widenE = <E1>() => <E, A>(fa: Either<E, A>): Either<E | E1, A> => fa;

export const widenA = <A1>() => <E, A>(fa: Either<E, A>): Either<E, A | A1> => fa;
