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
  interface URItoInterpreted<Env, E, A> {
    readonly [ArbitraryURI]: (_: Env) => fc.Arbitrary<A>
  }
  interface URItoConfig<E, A> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
  interface TupleConfig<Types> {
    readonly [ArbitraryURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, infer A>] ? fc.Arbitrary<A> : never
    }
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
  interface ArrayConfig<E, A> {
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
  interface IsoConfig<E, A, N> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
  interface PrismConfig<E, A, N> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [ArbitraryURI]: TaggedUnionConfigKind<ArbitraryURI, Types>
  }
  interface EitherConfig<EE, EA, AE, AA> {
    readonly [ArbitraryURI]: {
      readonly left: fc.Arbitrary<EA>
      readonly right: fc.Arbitrary<AA>
    }
  }
  interface OptionConfig<E, A> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<E, A> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
  interface OptionalConfig<E, A> {
    readonly [ArbitraryURI]: fc.Arbitrary<A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<E, A> {
    readonly [ArbitraryURI]: IntersectionConfigKind<ArbitraryURI, E, A>
  }
}

export const applyArbitraryConfig = getApplyConfig(ArbitraryURI)
