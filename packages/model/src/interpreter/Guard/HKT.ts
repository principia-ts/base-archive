import type { InterfaceConfigKind, InterpretedHKT, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as G from '@principia/base/Guard'

import { GuardURI } from '@principia/base/Guard'

import { getApplyConfig } from '../../HKT'

export type URI = GuardURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [GuardURI]: (_: Env) => G.Guard<unknown, A>
  }
  interface URItoConfig<S, R, E, A> {
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
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, any, any, infer A>]
        ? G.Guard<unknown, A>
        : never
    }
  }
}

declare module '../../algebra/object' {
  interface TypeConfig<Props> {
    readonly [GuardURI]: InterfaceConfigKind<URI, Props>
  }
  interface PartialConfig<Props> {
    readonly [GuardURI]: InterfaceConfigKind<URI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [GuardURI]: {
      required: InterfaceConfigKind<URI, Props>
      optional: InterfaceConfigKind<URI, PropsPartial>
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
    readonly [GuardURI]: TaggedUnionConfigKind<URI, Types>
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [GuardURI]: {
      readonly left: G.Guard<unknown, EA>
      readonly right: G.Guard<unknown, AA>
    }
  }
  interface OptionConfig<S, R, E, A> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<S, R, E, A> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [GuardURI]: G.Guard<unknown, A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<S, R, E, A> {
    readonly [GuardURI]: IntersectionConfigKind<URI, S, R, E, A>
  }
}

export const applyGuardConfig = getApplyConfig(GuardURI)
