import type { InterfaceConfigKind, InterpretedHKT, IntersectionConfigKind, TaggedUnionConfigKind } from '../../HKT'
import type * as D from '@principia/codec/DecoderK'

import { getApplyConfig } from '../../HKT'

export const DecoderKURI = 'model/DecoderK'
export type DecoderKURI = typeof DecoderKURI

declare module '../../HKT' {
  interface URItoInterpreted<Env, E, A> {
    readonly [DecoderKURI]: (_: Env) => D.DecoderK<unknown, A>
  }
  interface URItoConfig<E, A> {
    readonly [DecoderKURI]: D.DecoderK<unknown, A>
  }
}

declare module '../../algebra/primitives' {
  interface NonEmptyArrayConfig<E, A> {
    readonly [DecoderKURI]: D.DecoderK<unknown, A>
  }
  interface ArrayConfig<E, A> {
    readonly [DecoderKURI]: D.DecoderK<unknown, A>
  }
  interface TupleConfig<Types> {
    readonly [DecoderKURI]: {
      [K in keyof Types]: [Types[K]] extends [InterpretedHKT<any, any, any, infer A>] ? D.DecoderK<unknown, A> : never
    }
  }
}

declare module '../../algebra/struct' {
  interface StructConfig<Props> {
    readonly [DecoderKURI]: InterfaceConfigKind<DecoderKURI, Props>
  }
  interface PartialConfig<Props> {
    readonly [DecoderKURI]: InterfaceConfigKind<DecoderKURI, Props>
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [DecoderKURI]: {
      required: InterfaceConfigKind<DecoderKURI, Props>
      optional: InterfaceConfigKind<DecoderKURI, PropsPartial>
    }
  }
}

declare module '../../algebra/newtype' {
  interface IsoConfig<E, A, N> {
    readonly [DecoderKURI]: D.DecoderK<unknown, A>
  }
  interface PrismConfig<E, A, N> {
    readonly [DecoderKURI]: D.DecoderK<unknown, A>
  }
}

declare module '../../algebra/record' {
  interface RecordConfig<E, A> {
    readonly [DecoderKURI]: D.DecoderK<unknown, A>
  }
}

declare module '../../algebra/set' {
  interface SetConfig<E, A> {
    readonly [DecoderKURI]: D.DecoderK<unknown, A>
  }
}

declare module '../../algebra/sum' {
  interface TaggedUnionConfig<Types> {
    readonly [DecoderKURI]: TaggedUnionConfigKind<DecoderKURI, Types>
  }
  interface EitherConfig<EE, EA, AE, AA> {
    readonly [DecoderKURI]: {
      readonly left: D.DecoderK<unknown, EA>
      readonly right: D.DecoderK<unknown, AA>
    }
  }
  interface OptionConfig<E, A> {
    readonly [DecoderKURI]: D.DecoderK<unknown, A>
  }
}

declare module '../../algebra/nullable' {
  interface NullableConfig<E, A> {
    readonly [DecoderKURI]: D.DecoderK<unknown, A>
  }
  interface OptionalConfig<E, A> {
    readonly [DecoderKURI]: D.DecoderK<unknown, A>
  }
}

declare module '../../algebra/intersection' {
  interface IntersectionConfig<E, A> {
    readonly [DecoderKURI]: IntersectionConfigKind<DecoderKURI, E, A>
  }
}

export const applyDecoderConfig = getApplyConfig(DecoderKURI)
