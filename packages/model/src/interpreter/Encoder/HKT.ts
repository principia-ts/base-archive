import type { InterfaceConfigKind, IntersectionConfigKind, TaggedUnionConfigKind } from "../../HKT";

import * as E from "@principia/decoders/Encoder";

import { getApplyConfig } from "../../HKT";

declare module "../../HKT" {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [E.URI]: (_: Env) => E.Encoder<E, A>;
  }
  interface URItoConfig<S, R, E, A> {
    readonly [E.URI]: E.Encoder<E, A>;
  }
}

declare module "../../algebra/primitives" {
  interface NonEmptyArrayConfig<E, A> {
    readonly [E.URI]: E.Encoder<E, A>;
  }
  interface ArrayConfig<E, A> {
    readonly [E.URI]: E.Encoder<E, A>;
  }
}

declare module "../../algebra/object" {
  interface TypeConfig<Props> {
    readonly [E.URI]: InterfaceConfigKind<E.URI, Props>;
  }
  interface PartialConfig<Props> {
    readonly [E.URI]: InterfaceConfigKind<E.URI, Props>;
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [E.URI]: {
      required: InterfaceConfigKind<E.URI, Props>;
      optional: InterfaceConfigKind<E.URI, PropsPartial>;
    };
  }
}

declare module "../../algebra/newtype" {
  interface IsoConfig<E, A, N> {
    readonly [E.URI]: E.Encoder<E, A>;
  }
  interface PrismConfig<E, A, N> {
    readonly [E.URI]: E.Encoder<E, A>;
  }
}

declare module "../../algebra/record" {
  interface RecordConfig<E, A> {
    readonly [E.URI]: E.Encoder<E, A>;
  }
}

declare module "../../algebra/set" {
  interface SetConfig<E, A> {
    readonly [E.URI]: E.Encoder<E, A>;
  }
}

declare module "../../algebra/sum" {
  interface TaggedUnionConfig<Types> {
    readonly [E.URI]: TaggedUnionConfigKind<E.URI, Types>;
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [E.URI]: {
      readonly left: E.Encoder<EE, EA>;
      readonly right: E.Encoder<AE, AA>;
    };
  }
  interface OptionConfig<S, R, E, A> {
    readonly [E.URI]: E.Encoder<E, A>;
  }
}

declare module "../../algebra/nullable" {
  interface NullableConfig<S, R, E, A> {
    readonly [E.URI]: E.Encoder<E, A>;
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [E.URI]: E.Encoder<E, A>;
  }
}

declare module "../../algebra/intersection" {
  interface IntersectionConfig<S, R, E, A> {
    readonly [E.URI]: IntersectionConfigKind<E.URI, S, R, E, A>;
  }
}

export const applyEncoderConfig = getApplyConfig(E.URI);
