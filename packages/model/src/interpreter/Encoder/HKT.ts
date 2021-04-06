import type { InterfaceConfigKind, InterpretedHKT, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as E from '@principia/codec/Encoder'

import { getApplyConfig } from '../../HKT'

export const EncoderURI = 'model/Encoder'
export type EncoderURI = typeof EncoderURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, I, E, A, O> {
    readonly [EncoderURI]: (_: Env) => E.Encoder<A, O>
  }
  interface URItoConfig<I, E, A, O> {
    readonly [EncoderURI]: E.Encoder<A, O>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<I, E, A, O> {
    readonly [EncoderURI]: E.Encoder<A, O>
  }
  interface ArrayConfig<I, E, A, O> {
    readonly [EncoderURI]: E.Encoder<A, O>
  }
  interface TupleConfig<Types> {
    readonly [EncoderURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, any, infer A, infer O>]
        ? E.Encoder<A, O>
        : never
    }
  }
}

declare module '../../algebra/struct' {
  interface StructConfig<Props> {
    readonly [EncoderURI]: InterfaceConfigKind<EncoderURI, Props>
  }
  interface PartialConfig<Props> {
    readonly [EncoderURI]: InterfaceConfigKind<EncoderURI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [EncoderURI]: {
      required: InterfaceConfigKind<EncoderURI, Props>
      optional: InterfaceConfigKind<EncoderURI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<I, E, A, O, N> {
    readonly [EncoderURI]: E.Encoder<A, O>
  }
  interface PrismConfig<I, E, A, O, N> {
    readonly [EncoderURI]: E.Encoder<A, O>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<I, E, A, O> {
    readonly [EncoderURI]: E.Encoder<A, O>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<I, E, A, O> {
    readonly [EncoderURI]: E.Encoder<A, O>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [EncoderURI]: TaggedUnionConfigKind<EncoderURI, Types>
  }
  interface EitherConfig<EI, EE, EA, EO, AI, AE, AA, AO> {
    readonly [EncoderURI]: {
      readonly left: E.Encoder<EA, EO>
      readonly right: E.Encoder<AA, AO>
    }
  }
  interface OptionConfig<I, E, A, O> {
    readonly [EncoderURI]: E.Encoder<A, O>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<I, E, A, O> {
    readonly [EncoderURI]: E.Encoder<A, O>
  }
  interface OptionalConfig<I, E, A, O> {
    readonly [EncoderURI]: E.Encoder<A, O>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<I, E, A, O> {
    readonly [EncoderURI]: IntersectionConfigKind<EncoderURI, I, E, A, O>
  }
}

export const applyEncoderConfig = getApplyConfig(EncoderURI)
