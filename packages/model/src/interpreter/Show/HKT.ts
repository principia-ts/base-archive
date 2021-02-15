import type { ExtractURI, InterfaceConfigKind, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as S from '@principia/base/Show'

import { ShowURI } from '@principia/base/Modules'

import { getApplyConfig } from '../../HKT'

export type URI = ShowURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [ShowURI]: (_: Env) => S.Show<A>
  }
  interface URItoConfig<S, R, E, A> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [ShowURI]: S.Show<A>
  }
  interface ArrayConfig<E, A> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/object' {
  interface TypeConfig<Props> {
    readonly [ShowURI]: InterfaceConfigKind<URI, Props>
  }
  interface PartialConfig<Props> {
    readonly [ShowURI]: InterfaceConfigKind<URI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [ShowURI]: {
      required: InterfaceConfigKind<URI, Props>
      optional: InterfaceConfigKind<URI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<E, A, N> {
    readonly [ShowURI]: S.Show<A>
  }
  interface PrismConfig<E, A, N> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [ShowURI]: TaggedUnionConfigKind<URI, Types>
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [ShowURI]: {
      readonly left: S.Show<EA>
      readonly right: S.Show<AA>
    }
  }
  interface OptionConfig<S, R, E, A> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<S, R, E, A> {
    readonly [ShowURI]: S.Show<A>
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<S, R, E, A> {
    readonly [ShowURI]: IntersectionConfigKind<URI, S, R, E, A>
  }
}

export const applyShowConfig = getApplyConfig(ShowURI)
