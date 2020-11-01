import * as G from "@principia/core/Guard";

import type { Interface1, Intersection1, TaggedUnion1 } from "../../HKT";
import { getApplyConfig } from "../../HKT";

declare module "../../HKT" {
   interface URItoInterpreted<Env, S, R, E, A> {
      readonly [G.URI]: (_: Env) => G.Guard<unknown, A>;
   }
   interface URItoConfig<S, R, E, A> {
      readonly [G.URI]: G.Guard<unknown, A>;
   }
}

declare module "../../algebra/primitives" {
   interface NonEmptyArrayConfig<E, A> {
      readonly [G.URI]: G.Guard<unknown, A>;
   }
   interface ArrayConfig<E, A> {
      readonly [G.URI]: G.Guard<unknown, A>;
   }
}

declare module "../../algebra/object" {
   interface TypeConfig<Props> {
      readonly [G.URI]: Interface1<Props, G.URI>;
   }
   interface PartialConfig<Props> {
      readonly [G.URI]: Interface1<Props, G.URI>;
   }
   interface BothConfig<Props, PropsPartial> {
      readonly [G.URI]: {
         required: Interface1<Props, G.URI>;
         optional: Interface1<PropsPartial, G.URI>;
      };
   }
}

declare module "../../algebra/newtype" {
   interface IsoConfig<E, A, N> {
      readonly [G.URI]: G.Guard<unknown, A>;
   }
   interface PrismConfig<E, A, N> {
      readonly [G.URI]: G.Guard<unknown, A>;
   }
}

declare module "../../algebra/record" {
   interface RecordConfig<E, A> {
      readonly [G.URI]: G.Guard<unknown, A>;
   }
}

declare module "../../algebra/set" {
   interface SetConfig<E, A> {
      readonly [G.URI]: G.Guard<unknown, A>;
   }
}

declare module "../../algebra/sum" {
   interface TaggedUnionConfig<Types> {
      readonly [G.URI]: TaggedUnion1<Types, G.URI>;
   }
   interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
      readonly [G.URI]: {
         readonly left: G.Guard<unknown, EA>;
         readonly right: G.Guard<unknown, AA>;
      };
   }
   interface OptionConfig<S, R, E, A> {
      readonly [G.URI]: G.Guard<unknown, A>;
   }
}

declare module "../../algebra/nullable" {
   interface NullableConfig<S, R, E, A> {
      readonly [G.URI]: G.Guard<unknown, A>;
   }
   interface OptionalConfig<S, R, E, A> {
      readonly [G.URI]: G.Guard<unknown, A>;
   }
}

declare module "../../algebra/intersection" {
   interface IntersectionConfig<E, A> {
      readonly [G.URI]: Intersection1<A, G.URI>;
   }
}

export const applyGuardConfig = getApplyConfig(G.URI);
