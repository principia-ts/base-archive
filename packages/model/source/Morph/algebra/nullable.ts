import type { Option } from "@principia/core/Option";

import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from "../HKT";

export const NullableURI = "model/algebra/nullable";

export type NullableURI = typeof NullableURI;

declare module "../HKT" {
   interface URItoAlgebra<IURI, Env> {
      readonly [NullableURI]: NullableAlgebra<IURI, Env>;
   }
}

export interface NullableConfig<S, R, E, A> {}
export interface OptionalConfig<S, R, E, A> {}

export interface NullableAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
   readonly nullable: <S, R, E, A>(
      a: InterpretedKind<F, Env, S, R, E, A>,
      config?: Config<Env, S | null, R | null, E | null, A | null, NullableConfig<S, R, E, A>>
   ) => InterpretedKind<F, Env, S | null, R | null, E | null, A | null>;

   readonly optional: <S, R, E, A>(
      a: InterpretedKind<F, Env, S, R, E, A>,
      config?: Config<Env, S | null, R | null, E | null, Option<A>, OptionalConfig<S, R, E, A>>
   ) => InterpretedKind<F, Env, S | null, R | null, E | null, Option<A>>;
}
