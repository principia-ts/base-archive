import type { AnyEnv, InterfaceConfigKind, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as fc from 'fast-check'

import { getApplyConfig } from '../../HKT'

export const ArbitraryURI = 'model/Arbitrary'
export type ArbitraryURI = typeof ArbitraryURI

export interface FastCheckEnv {
  [ArbitraryURI]: {
    readonly module: typeof fc
  }
}

export function accessFastCheck<Env extends AnyEnv>(env: Env): typeof fc {
  return ((env as unknown) as FastCheckEnv)[ArbitraryURI].module
}

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
}

declare module '../../HKT' {
  interface URItoInterpreted<Env, I, E, A, O> {
    readonly [ArbitraryURI]: (_: Env) => fc.Arbitrary<A>
  }
  interface URItoConfig<I, E, A, O> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
  interface TupleConfig<Types> {
    readonly [ArbitraryURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, any, infer A, any>]
        ? fc.Arbitrary<A>
        : never
    }
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<I, E, A, O> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
  interface ArrayConfig<I, E, A, O> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/struct' {
  interface StructConfig<Props> {
    readonly [ArbitraryURI]: InterfaceConfigKind<ArbitraryURI, Props>
  }
  interface PartialConfig<Props> {
    readonly [ArbitraryURI]: InterfaceConfigKind<ArbitraryURI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [ArbitraryURI]: {
      required: InterfaceConfigKind<ArbitraryURI, Props>
      optional: InterfaceConfigKind<ArbitraryURI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<I, E, A, O, N> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
  interface PrismConfig<I, E, A, O, N> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<I, E, A, O> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<I, E, A, O> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [ArbitraryURI]: TaggedUnionConfigKind<ArbitraryURI, Types>
  }
  interface EitherConfig<EI, EE, EA, EO, AI, AE, AA, AO> {
    readonly [ArbitraryURI]: {
      readonly left: fc.Arbitrary<EA>
      readonly right: fc.Arbitrary<AA>
    }
  }
  interface OptionConfig<I, E, A, O> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<I, E, A, O> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
  interface OptionalConfig<I, E, A, O> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<I, E, A, O> {
    readonly [ArbitraryURI]: IntersectionConfigKind<ArbitraryURI, I, E, A, O>
  }
}

export const applyArbitraryConfig = getApplyConfig(ArbitraryURI)
