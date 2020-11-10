import * as Eq from "@principia/core/Eq";

import type { InterfaceConfigKind, IntersectionConfigKind, TaggedUnionConfigKind } from "../../HKT";
import { getApplyConfig } from "../../HKT";

declare module "../../HKT" {
   interface URItoInterpreted<Env, S, R, E, A> {
      readonly [Eq.URI]: (_: Env) => Eq.Eq<A>;
   }
   interface URItoConfig<S, R, E, A> {
      readonly [Eq.URI]: Eq.Eq<A>;
   }
}

declare module "../../algebra/primitives" {
   interface NonEmptyArrayConfig<E, A> {
      readonly [Eq.URI]: Eq.Eq<A>;
   }
   interface ArrayConfig<E, A> {
      readonly [Eq.URI]: Eq.Eq<A>;
   }
}

declare module "../../algebra/object" {
   interface TypeConfig<Props> {
      readonly [Eq.URI]: InterfaceConfigKind<Eq.URI, Props>;
   }
   interface PartialConfig<Props> {
      readonly [Eq.URI]: InterfaceConfigKind<Eq.URI, Props>;
   }
   interface BothConfig<Props, PropsPartial> {
      readonly [Eq.URI]: {
         required: InterfaceConfigKind<Eq.URI, Props>;
         optional: InterfaceConfigKind<Eq.URI, PropsPartial>;
      };
   }
}

declare module "../../algebra/newtype" {
   interface IsoConfig<E, A, N> {
      readonly [Eq.URI]: Eq.Eq<A>;
   }
   interface PrismConfig<E, A, N> {
      readonly [Eq.URI]: Eq.Eq<A>;
   }
}

declare module "../../algebra/record" {
   interface RecordConfig<E, A> {
      readonly [Eq.URI]: Eq.Eq<A>;
   }
}

declare module "../../algebra/set" {
   interface SetConfig<E, A> {
      readonly [Eq.URI]: Eq.Eq<A>;
   }
}

declare module "../../algebra/sum" {
   interface TaggedUnionConfig<Types> {
      readonly [Eq.URI]: TaggedUnionConfigKind<Eq.URI, Types>;
   }
   interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
      readonly [Eq.URI]: {
         readonly left: Eq.Eq<EA>;
         readonly right: Eq.Eq<AA>;
      };
   }
   interface OptionConfig<S, R, E, A> {
      readonly [Eq.URI]: Eq.Eq<A>;
   }
}

declare module "../../algebra/nullable" {
   interface NullableConfig<S, R, E, A> {
      readonly [Eq.URI]: Eq.Eq<A>;
   }
   interface OptionalConfig<S, R, E, A> {
      readonly [Eq.URI]: Eq.Eq<A>;
   }
}

declare module "../../algebra/intersection" {
   interface IntersectionConfig<S, R, E, A> {
      readonly [Eq.URI]: IntersectionConfigKind<Eq.URI, S, R, E, A>;
   }
}

export const applyEqConfig = getApplyConfig(Eq.URI);
