import type { InterfaceConfigKind, InterpretedHKT, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as G from '@principia/base/Guard'

import { getApplyConfig } from '../../HKT'

export const GuardURI = 'model/Guard'
export type GuardURI = typeof GuardURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, E, A> {
    readonly [GuardURI]: (_: Env) => G.Guard<unknown, A>
  }
  interface URItoConfig<E, A> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
  interface ArrayConfig<E, A> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
  interface TupleConfig<Types> {
    readonly [GuardURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, infer A>] ? G.Guard<unknown, A> : never
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
  interface IsoConfig<E, A, N> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
  interface PrismConfig<E, A, N> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [GuardURI]: TaggedUnionConfigKind<GuardURI, Types>
  }
  interface EitherConfig<EE, EA, AE, AA> {
    readonly [GuardURI]: {
      readonly left: G.Guard<unknown, EA>
      readonly right: G.Guard<unknown, AA>
    }
  }
  interface OptionConfig<E, A> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<E, A> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
  interface OptionalConfig<E, A> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<E, A> {
    readonly [GuardURI]: IntersectionConfigKind<GuardURI, E, A>
  }
}

export const applyGuardConfig = getApplyConfig(GuardURI)
