import type { InterfaceConfigKind, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'

import * as G from '@principia/base/Guard'

import { getApplyConfig } from '../../HKT'

declare module '../../HKT' {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [G.URI]: (_: Env) => G.Guard<unknown, A>
  }
  interface URItoConfig<S, R, E, A> {
    readonly [G.URI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [G.URI]: G.Guard<unknown, A>
  }
  interface ArrayConfig<E, A> {
    readonly [G.URI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/object' {
  interface TypeConfig<Props> {
    readonly [G.URI]: InterfaceConfigKind<G.URI, Props>
  }
  interface PartialConfig<Props> {
    readonly [G.URI]: InterfaceConfigKind<G.URI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [G.URI]: {
      required: InterfaceConfigKind<G.URI, Props>
      optional: InterfaceConfigKind<G.URI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<E, A, N> {
    readonly [G.URI]: G.Guard<unknown, A>
  }
  interface PrismConfig<E, A, N> {
    readonly [G.URI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [G.URI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [G.URI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [G.URI]: TaggedUnionConfigKind<G.URI, Types>
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [G.URI]: {
      readonly left: G.Guard<unknown, EA>
      readonly right: G.Guard<unknown, AA>
    }
  }
  interface OptionConfig<S, R, E, A> {
    readonly [G.URI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<S, R, E, A> {
    readonly [G.URI]: G.Guard<unknown, A>
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [G.URI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<S, R, E, A> {
    readonly [G.URI]: IntersectionConfigKind<G.URI, S, R, E, A>
  }
}

export const applyGuardConfig = getApplyConfig(G.URI)
