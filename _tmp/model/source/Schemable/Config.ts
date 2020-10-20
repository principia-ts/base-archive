import { identity } from "@principia/core/Function";
import type * as HKT from "@principia/prelude/HKT";

import type { ConcreteInterpreterURIS, InterpreterKind, Mix } from "./HKT";

export type ThreadURI<URI extends ConcreteInterpreterURIS, K> = URI extends keyof K ? K[URI] : {};

export type InterpreterURISIndexedAny = Record<ConcreteInterpreterURIS, any>;

export type MapToConfig<T extends InterpreterURISIndexedAny, K> = {
   [URI in ConcreteInterpreterURIS]?: (a: T[URI], k: ThreadURI<URI, K>) => T[URI];
};

export interface URItoConfigType<F extends HKT.URIS, C, R, I, O, A> {}

export type Config<
   IC,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E,
   A extends I0,
   N1 extends string,
   K1,
   Q1,
   W1,
   X1,
   I1,
   S1,
   R1,
   Config = {}
> = {
   [URI in ConcreteInterpreterURIS]?: (
      a: InterpreterKind<URI, IC, F, C, I0, N, K, Q, W, X, I, S, R, E, A>,
      k: ThreadURI<URI, Config>
   ) => InterpreterKind<
      URI,
      IC,
      F,
      C,
      I0,
      HKT.Mix<C, "N", [N, N1]>,
      HKT.Mix<C, "K", [K, K1]>,
      HKT.Mix<C, "Q", [Q, Q1]>,
      HKT.Mix<C, "W", [W, W1]>,
      HKT.Mix<C, "X", [X, X1]>,
      HKT.Mix<C, "I", [I, I1]>,
      HKT.Mix<C, "S", [S, S1]>,
      HKT.Mix<C, "R", [R, R1]>,
      E,
      A
   >;
};

export const getApplyConfig: <URI extends ConcreteInterpreterURIS>(
   uri: URI
) => <Config>(config?: Config) => NonNullable<ThreadURI<URI, Config>> = (uri) => (config) =>
   ((a: any, k: any) => ((config && (config as any)[uri] ? (config as any)[uri] : identity) as any)(a, k)) as any;
