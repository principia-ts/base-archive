import { deriveDo } from "@principia/prelude";

import { succeed } from "./constructors";
import type { Async } from "./model";
import { Monad } from "./monad";

/*
 * -------------------------------------------
 * Do Async
 * -------------------------------------------
 */

export const Do = deriveDo(Monad);

const of: Async<unknown, never, {}> = succeed({});
export { of as do };

export const letS: <K, N extends string, A>(
  name: Exclude<N, keyof K>,
  f: (_: K) => A
) => <R, E>(
  mk: Async<R, E, K>
) => Async<
  R,
  E,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A;
  }
> = Do.letS;

export const bindS: <R, E, A, K, N extends string>(
  name: Exclude<N, keyof K>,
  f: (_: K) => Async<R, E, A>
) => <R2, E2>(
  mk: Async<R2, E2, K>
) => Async<
  R & R2,
  E | E2,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A;
  }
> = Do.bindS;

export const bindToS: <K, N extends string>(
  name: Exclude<N, keyof K>
) => <R, E, A>(fa: Async<R, E, A>) => Async<R, E, { [k in Exclude<N, keyof K>]: A }> = Do.bindToS;
