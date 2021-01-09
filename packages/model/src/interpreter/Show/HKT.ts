import type { InterfaceConfigKind, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'

import * as S from '@principia/base/Show'

import { getApplyConfig } from '../../HKT'

declare module '../../HKT' {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [S.URI]: (_: Env) => S.Show<A>
  }
  interface URItoConfig<S, R, E, A> {
    readonly [S.URI]: S.Show<A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [S.URI]: S.Show<A>
  }
  interface ArrayConfig<E, A> {
    readonly [S.URI]: S.Show<A>
  }
}

declare module '../../algebra/object' {
  interface TypeConfig<Props> {
    readonly [S.URI]: InterfaceConfigKind<S.URI, Props>
  }
  interface PartialConfig<Props> {
    readonly [S.URI]: InterfaceConfigKind<S.URI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [S.URI]: {
      required: InterfaceConfigKind<S.URI, Props>
      optional: InterfaceConfigKind<S.URI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<E, A, N> {
    readonly [S.URI]: S.Show<A>
  }
  interface PrismConfig<E, A, N> {
    readonly [S.URI]: S.Show<A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [S.URI]: S.Show<A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [S.URI]: S.Show<A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [S.URI]: TaggedUnionConfigKind<S.URI, Types>
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [S.URI]: {
      readonly left: S.Show<EA>
      readonly right: S.Show<AA>
    }
  }
  interface OptionConfig<S, R, E, A> {
    readonly [S.URI]: S.Show<A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<S, R, E, A> {
    readonly [S.URI]: S.Show<A>
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [S.URI]: S.Show<A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<S, R, E, A> {
    readonly [S.URI]: IntersectionConfigKind<S.URI, S, R, E, A>
  }
}

export const applyShowConfig = getApplyConfig(S.URI)
