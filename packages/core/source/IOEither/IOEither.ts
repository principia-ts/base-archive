import type { Either } from "../Either";
import type * as HKT from "../HKT";
import type { IO } from "../IO";

/*
 * -------------------------------------------
 * IOEither Model
 * -------------------------------------------
 */

export interface IOEither<E, A> extends IO<Either<E, A>> {}

export const URI = "IOEither";

export type URI = typeof URI;

export type V = HKT.V<"E", "+">;

declare module "../HKT" {
   export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      [URI]: IOEither<E, A>;
   }
}
