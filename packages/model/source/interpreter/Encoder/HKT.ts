import * as E from "@principia/core/Encoder";
import type * as HKT from "@principia/prelude/HKT";

import type { Interface2, Intersection2, TaggedUnion2 } from "../../HKT";
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
      readonly [E.URI]: Interface2<Props, E.URI, E.V>;
   }
   interface PartialConfig<Props> {
      readonly [E.URI]: Interface2<Props, E.URI, E.V>;
   }
   interface BothConfig<Props, PropsPartial> {
      readonly [E.URI]: {
         required: Interface2<Props, E.URI, E.V>;
         optional: Interface2<PropsPartial, E.URI, E.V>;
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
      readonly [E.URI]: TaggedUnion2<Types, E.URI, E.V & HKT.Fix2<"E", unknown>>;
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
   interface IntersectionConfig<E, A> {
      readonly [E.URI]: Intersection2<E, A, E.URI, E.V>;
   }
}

export const applyEncoderConfig = getApplyConfig(E.URI);
