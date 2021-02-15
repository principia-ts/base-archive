import type { ExtractURI, InterfaceConfigKind, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'

import * as Eq from '@principia/base/Eq'

import { getApplyConfig } from '../../HKT'

export type URI = ExtractURI<Eq.URI>

declare module '../../HKT' {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [Eq.URI]: (_: Env) => Eq.Eq<A>
  }
  interface URItoConfig<S, R, E, A> {
    readonly [Eq.URI]: Eq.Eq<A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [Eq.URI]: Eq.Eq<A>
  }
  interface ArrayConfig<E, A> {
    readonly [Eq.URI]: Eq.Eq<A>
  }
}

declare module '../../algebra/object' {
  interface TypeConfig<Props> {
    readonly [Eq.URI]: InterfaceConfigKind<URI, Props>
  }
  interface PartialConfig<Props> {
    readonly [Eq.URI]: InterfaceConfigKind<URI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [Eq.URI]: {
      required: InterfaceConfigKind<URI, Props>
      optional: InterfaceConfigKind<URI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<E, A, N> {
    readonly [Eq.URI]: Eq.Eq<A>
  }
  interface PrismConfig<E, A, N> {
    readonly [Eq.URI]: Eq.Eq<A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [Eq.URI]: Eq.Eq<A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [Eq.URI]: Eq.Eq<A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [Eq.URI]: TaggedUnionConfigKind<URI, Types>
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [Eq.URI]: {
      readonly left: Eq.Eq<EA>
      readonly right: Eq.Eq<AA>
    }
  }
  interface OptionConfig<S, R, E, A> {
    readonly [Eq.URI]: Eq.Eq<A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<S, R, E, A> {
    readonly [Eq.URI]: Eq.Eq<A>
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [Eq.URI]: Eq.Eq<A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<S, R, E, A> {
    readonly [Eq.URI]: IntersectionConfigKind<URI, S, R, E, A>
  }
}

export const applyEqConfig = getApplyConfig(Eq.URI)
