import type { InterfaceConfigKind, InterpretedHKT, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as G from '@principia/base/Guard'

import { getApplyConfig } from '../../HKT'

export const GuardURI = 'model/Guard'
export type GuardURI = typeof GuardURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, I, E, A, O> {
    readonly [GuardURI]: (_: Env) => G.Guard<unknown, A>
  }
  interface URItoConfig<I, E, A, O> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<I, E, A, O> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
  interface ArrayConfig<I, E, A, O> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
  interface TupleConfig<Types> {
    readonly [GuardURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, any, infer A, any>]
        ? G.Guard<unknown, A>
        : never
    }
  }
}

declare module '../../algebra/struct' {
  interface StructConfig<Props> {
    readonly [GuardURI]: InterfaceConfigKind<GuardURI, Props>
  }
  interface PartialConfig<Props> {
    readonly [GuardURI]: InterfaceConfigKind<GuardURI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [GuardURI]: {
      required: InterfaceConfigKind<GuardURI, Props>
      optional: InterfaceConfigKind<GuardURI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<I, E, A, O, N> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
  interface PrismConfig<I, E, A, O, N> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<I, E, A, O> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<I, E, A, O> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [GuardURI]: TaggedUnionConfigKind<GuardURI, Types>
  }
  interface EitherConfig<EI, EE, EA, EO, AI, AE, AA, AO> {
    readonly [GuardURI]: {
      readonly left: G.Guard<unknown, EA>
      readonly right: G.Guard<unknown, AA>
    }
  }
  interface OptionConfig<I, E, A, O> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<I, E, A, O> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
  interface OptionalConfig<I, E, A, O> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<I, E, A, O> {
    readonly [GuardURI]: IntersectionConfigKind<GuardURI, I, E, A, O>
  }
}

export const applyGuardConfig = getApplyConfig(GuardURI)
