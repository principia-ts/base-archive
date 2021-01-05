import type { InterfaceConfigKind, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as D from '@principia/codec/DecoderKF'

import { getApplyConfig } from '../../HKT'

export const URI = 'ModelDecoder'
export type URI = typeof URI

declare module '../../HKT' {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [URI]: (
      _: Env
    ) => D.DecoderKF<unknown, A>
  }
  interface URItoConfig<S, R, E, A> {
    readonly [URI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [URI]: D.DecoderKF<unknown, A>
  }
  interface ArrayConfig<E, A> {
    readonly [URI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/object' {
  interface TypeConfig<Props> {
    readonly [URI]: InterfaceConfigKind<URI, Props>
  }
  interface PartialConfig<Props> {
    readonly [URI]: InterfaceConfigKind<URI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [URI]: {
      required: InterfaceConfigKind<URI, Props>
      optional: InterfaceConfigKind<URI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<E, A, N> {
    readonly [URI]: D.DecoderKF<unknown, A>
  }
  interface PrismConfig<E, A, N> {
    readonly [URI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [URI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [URI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [URI]: TaggedUnionConfigKind<URI, Types>
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [URI]: {
      readonly left: D.DecoderKF<unknown, EA>
      readonly right: D.DecoderKF<unknown, AA>
    }
  }
  interface OptionConfig<S, R, E, A> {
    readonly [URI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<S, R, E, A> {
    readonly [URI]: D.DecoderKF<unknown, A>
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [URI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<S, R, E, A> {
    readonly [URI]: IntersectionConfigKind<URI, S, R, E, A>
  }
}

export const applyDecoderConfig = getApplyConfig(URI)
