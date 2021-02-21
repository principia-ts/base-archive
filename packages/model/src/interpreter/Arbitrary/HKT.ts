import type { AnyEnv, InterfaceConfigKind, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as fc from 'fast-check'

import { getApplyConfig } from '../../HKT'

export const ArbURI = 'Arbitrary'
export type ArbURI = typeof ArbURI

export interface FastCheckEnv {
  [ArbURI]: {
    readonly module: typeof fc
  }
}

export function accessFastCheck<Env extends AnyEnv>(env: Env): typeof fc {
  return (env as FastCheckEnv)[ArbURI].module
}

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [ArbURI]: fc.Arbitrary<A>
  }
}

declare module '../../HKT' {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [ArbURI]: (_: Env) => fc.Arbitrary<A>
  }
  interface URItoConfig<S, R, E, A> {
    readonly [ArbURI]: fc.Arbitrary<A>
  }
  interface TupleConfig<Types> {
    readonly [ArbURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, any, any, infer A>]
        ? fc.Arbitrary<A>
        : never
    }
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [ArbURI]: fc.Arbitrary<A>
  }
  interface ArrayConfig<E, A> {
    readonly [ArbURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/object' {
  interface TypeConfig<Props> {
    readonly [ArbURI]: InterfaceConfigKind<ArbURI, Props>
  }
  interface PartialConfig<Props> {
    readonly [ArbURI]: InterfaceConfigKind<ArbURI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [ArbURI]: {
      required: InterfaceConfigKind<ArbURI, Props>
      optional: InterfaceConfigKind<ArbURI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<E, A, N> {
    readonly [ArbURI]: fc.Arbitrary<A>
  }
  interface PrismConfig<E, A, N> {
    readonly [ArbURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [ArbURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [ArbURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [ArbURI]: TaggedUnionConfigKind<ArbURI, Types>
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [ArbURI]: {
      readonly left: fc.Arbitrary<EA>
      readonly right: fc.Arbitrary<AA>
    }
  }
  interface OptionConfig<S, R, E, A> {
    readonly [ArbURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<S, R, E, A> {
    readonly [ArbURI]: fc.Arbitrary<A>
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [ArbURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<S, R, E, A> {
    readonly [ArbURI]: IntersectionConfigKind<ArbURI, S, R, E, A>
  }
}

export const applyArbitraryConfig = getApplyConfig(ArbURI)
