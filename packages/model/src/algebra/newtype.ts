import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from "../HKT";
import type { Iso } from "@principia/optics/Iso";
import type { Prism } from "@principia/optics/Prism";
import type { Newtype } from "@principia/prelude";

export const NewtypeURI = "model/algebra/newtype";

export type NewtypeURI = typeof NewtypeURI;

declare module "../HKT" {
  interface URItoAlgebra<IURI, Env> {
    readonly [NewtypeURI]: NewtypeAlgebra<IURI, Env>;
  }
}

export interface IsoConfig<E, A, N> {}
export interface PrismConfig<E, A, N> {}

export interface NewtypeAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly newtypeIso: <E, A, N extends Newtype<any, A>>(
    iso: Iso<A, N>,
    a: InterpretedKind<F, Env, unknown, unknown, E, A>,
    config?: Config<Env, unknown, unknown, E, N, IsoConfig<E, A, N>>
  ) => InterpretedKind<F, Env, unknown, unknown, E, N>;

  readonly newtypePrism: <E, A, N extends Newtype<any, A>>(
    prism: Prism<A, N>,
    a: InterpretedKind<F, Env, unknown, unknown, E, A>,
    config?: Config<Env, unknown, unknown, E, N, PrismConfig<E, A, N>>
  ) => InterpretedKind<F, Env, unknown, unknown, E, N>;
}
