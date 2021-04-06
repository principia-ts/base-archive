import type { InterfaceConfigKind, InterpretedHKT, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as Eq from '@principia/base/Eq'

import { getApplyConfig } from '../../HKT'

export const EqURI = 'model/Eq'
export type EqURI = typeof EqURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, I, E, A, O> {
    readonly [EqURI]: (_: Env) => Eq.Eq<A>
  }
  interface URItoConfig<I, E, A, O> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<I, E, A, O> {
    readonly [EqURI]: Eq.Eq<A>
  }
  interface ArrayConfig<I, E, A, O> {
    readonly [EqURI]: Eq.Eq<A>
  }
  interface TupleConfig<Types> {
    readonly [EqURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, any, infer A, any>] ? Eq.Eq<A> : never
    }
  }
}

declare module '../../algebra/struct' {
  interface StructConfig<Props> {
    readonly [EqURI]: InterfaceConfigKind<EqURI, Props>
  }
  interface PartialConfig<Props> {
    readonly [EqURI]: InterfaceConfigKind<EqURI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [EqURI]: {
      required: InterfaceConfigKind<EqURI, Props>
      optional: InterfaceConfigKind<EqURI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<I, E, A, O, N> {
    readonly [EqURI]: Eq.Eq<A>
  }
  interface PrismConfig<I, E, A, O, N> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<I, E, A, O> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<I, E, A, O> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [EqURI]: TaggedUnionConfigKind<EqURI, Types>
  }
  interface EitherConfig<EI, EE, EA, EO, AI, AE, AA, AO> {
    readonly [EqURI]: {
      readonly left: Eq.Eq<EA>
      readonly right: Eq.Eq<AA>
    }
  }
  interface OptionConfig<I, E, A, O> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<I, E, A, O> {
    readonly [EqURI]: Eq.Eq<A>
  }
  interface OptionalConfig<I, E, A, O> {
    readonly [EqURI]: Eq.Eq<A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<I, E, A, O> {
    readonly [EqURI]: IntersectionConfigKind<EqURI, I, E, A, O>
  }
}

export const applyEqConfig = getApplyConfig(EqURI)
