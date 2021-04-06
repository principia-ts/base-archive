import type { InterfaceConfigKind, InterpretedHKT, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as S from '@principia/base/Show'

import { getApplyConfig } from '../../HKT'

export const ShowURI = 'model/Show'
export type ShowURI = typeof ShowURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, I, E, A, O> {
    readonly [ShowURI]: (_: Env) => S.Show<A>
  }
  interface URItoConfig<I, E, A, O> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<I, E, A, O> {
    readonly [ShowURI]: S.Show<A>
  }
  interface ArrayConfig<I, E, A, O> {
    readonly [ShowURI]: S.Show<A>
  }
  interface TupleConfig<Types> {
    readonly [ShowURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, any, infer A, any>] ? S.Show<A> : never
    }
  }
}

declare module '../../algebra/struct' {
  interface StructConfig<Props> {
    readonly [ShowURI]: InterfaceConfigKind<ShowURI, Props>
  }
  interface PartialConfig<Props> {
    readonly [ShowURI]: InterfaceConfigKind<ShowURI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [ShowURI]: {
      required: InterfaceConfigKind<ShowURI, Props>
      optional: InterfaceConfigKind<ShowURI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<I, E, A, O, N> {
    readonly [ShowURI]: S.Show<A>
  }
  interface PrismConfig<I, E, A, O, N> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<I, E, A, O> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<I, E, A, O> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [ShowURI]: TaggedUnionConfigKind<ShowURI, Types>
  }
  interface EitherConfig<EI, EE, EA, EO, AI, AE, AA, AO> {
    readonly [ShowURI]: {
      readonly left: S.Show<EA>
      readonly right: S.Show<AA>
    }
  }
  interface OptionConfig<I, E, A, O> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<I, E, A, O> {
    readonly [ShowURI]: S.Show<A>
  }
  interface OptionalConfig<I, E, A, O> {
    readonly [ShowURI]: S.Show<A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<I, E, A, O> {
    readonly [ShowURI]: IntersectionConfigKind<ShowURI, I, E, A, O>
  }
}

export const applyShowConfig = getApplyConfig(ShowURI)
