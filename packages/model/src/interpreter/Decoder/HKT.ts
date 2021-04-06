import type {
  ErrorOf,
  InputOf,
  InterfaceConfigKind,
  InterpretedHKT,
  IntersectionConfigKind,
  TaggedUnionConfigKind,
  TypeOf
} from '../../HKT'
import type * as D from '@principia/codec/Decoder'

import { getApplyConfig } from '../../HKT'

export const DecoderURI = 'model/Decoder'
export type DecoderURI = typeof DecoderURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, I, E, A, O> {
    readonly [DecoderURI]: (_: Env) => D.Decoder<I, E, A>
  }
  interface URItoConfig<I, E, A, O> {
    readonly [DecoderURI]: D.Decoder<I, E, A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayCustom<I, E, A, O> {
    readonly [DecoderURI]: D.Decoder<I, E, A>
  }
  interface ArrayCustom<I, E, A, O> {
    readonly [DecoderURI]: D.Decoder<I, E, A>
  }
  interface TupleCustom<Types> {
    readonly [DecoderURI]: {
      [K in keyof Types]: D.Decoder<
        InputOf<DecoderURI, any, Types[K]>,
        ErrorOf<DecoderURI, any, Types[K]>,
        TypeOf<DecoderURI, any, Types[K]>
      >
    }
  }
}

declare module '../../algebra/struct' {
  interface StructConfig<Props> {
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
  interface IsoConfig<I, E, A, O, N> {
    readonly [DecoderURI]: D.Decoder<I, E, A>
  }
  interface PrismConfig<I, E, A, O, N> {
    readonly [DecoderURI]: D.Decoder<I, E, A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<I, E, A, O> {
    readonly [DecoderURI]: D.Decoder<I, E, A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<I, E, A, O> {
    readonly [DecoderURI]: D.Decoder<I, E, A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [DecoderURI]: TaggedUnionConfigKind<DecoderURI, Types>
  }
  interface EitherConfig<EI, EE, EA, EO, AI, AE, AA, AO> {
    readonly [DecoderURI]: {
      readonly left: D.Decoder<EI, EE, EA>
      readonly right: D.Decoder<AI, AE, AA>
    }
  }
  interface OptionConfig<I, E, A, O> {
    readonly [DecoderURI]: D.Decoder<I, E, A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<I, E, A, O> {
    readonly [DecoderURI]: D.Decoder<I, E, A>
  }
  interface OptionalConfig<I, E, A, O> {
    readonly [DecoderURI]: D.Decoder<I, E, A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<I, E, A, O> {
    readonly [DecoderURI]: IntersectionConfigKind<DecoderURI, I, E, A, O>
  }
}

export const applyDecoderConfig = getApplyConfig(DecoderURI)
