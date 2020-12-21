import type { InterfaceConfigKind, IntersectionConfigKind, TaggedUnionConfigKind } from "../../HKT";
import type * as HKT from "@principia/base/HKT";
import type * as P from "@principia/base/typeclass";
import type * as D from "@principia/codec/Decoder";

import { getApplyConfig } from "../../HKT";

export const URI = "ModelDecoder";
export type URI = typeof URI;

declare module "../../HKT" {
  interface URItoInterpreted<Env, S, R, E, A> {
    readonly [URI]: (
      _: Env
    ) => <M extends HKT.URIS, C>(
      M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, D.V<C>> & P.Alt<M, D.V<C>>
    ) => D.Decoder<M, C, unknown, A>;
  }
  interface URItoConfig<S, R, E, A> {
    readonly [URI]: <M extends HKT.URIS, C>(
      M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, D.V<C>> & P.Alt<M, D.V<C>>
    ) => D.Decoder<M, C, unknown, A>;
  }
}

declare module "../../algebra/primitives" {
  interface NonEmptyArrayConfig<E, A> {
    readonly [URI]: <M extends HKT.URIS, C>(
      M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, C> & P.Alt<M, D.V<C>> & P.Applicative<M, D.V<C>>
    ) => D.Decoder<M, C, unknown, A>;
  }
  interface ArrayConfig<E, A> {
    readonly [URI]: <M extends HKT.URIS, C>(
      M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, C> & P.Alt<M, D.V<C>> & P.Applicative<M, D.V<C>>
    ) => D.Decoder<M, C, unknown, A>;
  }
}

declare module "../../algebra/object" {
  interface TypeConfig<Props> {
    readonly [URI]: InterfaceConfigKind<URI, Props>;
  }
  interface PartialConfig<Props> {
    readonly [URI]: InterfaceConfigKind<URI, Props>;
  }
  interface BothConfig<Props, PropsPartial> {
    readonly [URI]: {
      required: InterfaceConfigKind<URI, Props>;
      optional: InterfaceConfigKind<URI, PropsPartial>;
    };
  }
}

declare module "../../algebra/newtype" {
  interface IsoConfig<E, A, N> {
    readonly [URI]: <M extends HKT.URIS, C>(
      M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, C> & P.Alt<M, D.V<C>> & P.Applicative<M, D.V<C>>
    ) => D.Decoder<M, C, unknown, A>;
  }
  interface PrismConfig<E, A, N> {
    readonly [URI]: <M extends HKT.URIS, C>(
      M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, C> & P.Alt<M, D.V<C>> & P.Applicative<M, D.V<C>>
    ) => D.Decoder<M, C, unknown, A>;
  }
}

declare module "../../algebra/record" {
  interface RecordConfig<E, A> {
    readonly [URI]: <M extends HKT.URIS, C>(
      M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, C> & P.Alt<M, D.V<C>> & P.Applicative<M, D.V<C>>
    ) => D.Decoder<M, C, unknown, A>;
  }
}

declare module "../../algebra/set" {
  interface SetConfig<E, A> {
    readonly [URI]: <M extends HKT.URIS, C>(
      M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, C> & P.Alt<M, D.V<C>> & P.Applicative<M, D.V<C>>
    ) => D.Decoder<M, C, unknown, A>;
  }
}

declare module "../../algebra/sum" {
  interface TaggedUnionConfig<Types> {
    readonly [URI]: TaggedUnionConfigKind<URI, Types>;
  }
  interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
    readonly [URI]: {
      readonly left: <M extends HKT.URIS, C>(
        M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, C> & P.Alt<M, D.V<C>> & P.Applicative<M, D.V<C>>
      ) => D.Decoder<M, C, unknown, EA>;
      readonly right: <M extends HKT.URIS, C>(
        M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, C> & P.Alt<M, D.V<C>> & P.Applicative<M, D.V<C>>
      ) => D.Decoder<M, C, unknown, AA>;
    };
  }
  interface OptionConfig<S, R, E, A> {
    readonly [URI]: <M extends HKT.URIS, C>(
      M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, C> & P.Alt<M, D.V<C>> & P.Applicative<M, D.V<C>>
    ) => D.Decoder<M, C, unknown, A>;
  }
}

declare module "../../algebra/nullable" {
  interface NullableConfig<S, R, E, A> {
    readonly [URI]: <M extends HKT.URIS, C>(
      M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, C> & P.Alt<M, D.V<C>> & P.Applicative<M, D.V<C>>
    ) => D.Decoder<M, C, unknown, A>;
  }
  interface OptionalConfig<S, R, E, A> {
    readonly [URI]: <M extends HKT.URIS, C>(
      M: P.MonadFail<M, D.V<C>> & P.Bifunctor<M, C> & P.Alt<M, D.V<C>> & P.Applicative<M, D.V<C>>
    ) => D.Decoder<M, C, unknown, A>;
  }
}

declare module "../../algebra/intersection" {
  interface IntersectionConfig<S, R, E, A> {
    readonly [URI]: IntersectionConfigKind<URI, S, R, E, A>;
  }
}

export const applyDecoderConfig = getApplyConfig(URI);
