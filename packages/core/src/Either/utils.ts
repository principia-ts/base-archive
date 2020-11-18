import { identity } from "../Function";
import type { Either } from "./model";

/**
 * Compact type Either<E, A> | Either<E1, B> to Either<E | E1, A | B>
 */
export const deunion: <T extends Either<any, any>>(
  fa: T
) => [T] extends [Either<infer E, infer A>] ? Either<E, A> : T = identity as any;

export function widenE<E1>(): <E, A>(fa: Either<E, A>) => Either<E1 | E, A> {
  return identity;
}

export function widenA<A1>(): <E, A>(fa: Either<E, A>) => Either<E, A1 | A> {
  return identity;
}
