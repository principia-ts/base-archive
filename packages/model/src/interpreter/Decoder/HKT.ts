import type { InterfaceConfigKind, InterpretedHKT, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as D from '@principia/codec/DecoderKF'

import { getApplyConfig } from '../../HKT'

export const DecoderURI = 'model/Decoder'
export type DecoderURI = typeof DecoderURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [DecoderURI]: (_: Env) => D.DecoderKF<unknown, A>
  }
  interface URItoConfig<S, R, E, A> {
    readonly [DecoderURI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [DecoderURI]: D.DecoderKF<unknown, A>
  }
  interface ArrayConfig<E, A> {
    readonly [DecoderURI]: D.DecoderKF<unknown, A>
  }
  interface TupleConfig<Types> {
    readonly [DecoderURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, any, any, infer A>]
        ? D.DecoderKF<unknown, A>
        : never
    }
  }
}

declare module '../../algebra/object' {
  interface TypeConfig<Props> {
    readonly [DecoderURI]: InterfaceConfigKind<DecoderURI, Props>
  }
  interface PartialConfig<Props> {
    readonly [DecoderURI]: InterfaceConfigKind<DecoderURI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [DecoderURI]: {
      required: InterfaceConfigKind<DecoderURI, Props>
      optional: InterfaceConfigKind<DecoderURI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<E, A, N> {
    readonly [DecoderURI]: D.DecoderKF<unknown, A>
  }
  interface PrismConfig<E, A, N> {
    readonly [DecoderURI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [DecoderURI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [DecoderURI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [DecoderURI]: TaggedUnionConfigKind<DecoderURI, Types>
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [DecoderURI]: {
      readonly left: D.DecoderKF<unknown, EA>
      readonly right: D.DecoderKF<unknown, AA>
    }
  }
  interface OptionConfig<S, R, E, A> {
    readonly [DecoderURI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<S, R, E, A> {
    readonly [DecoderURI]: D.DecoderKF<unknown, A>
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [DecoderURI]: D.DecoderKF<unknown, A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<S, R, E, A> {
    readonly [DecoderURI]: IntersectionConfigKind<DecoderURI, S, R, E, A>
  }
}

export const applyDecoderConfig = getApplyConfig(DecoderURI)
