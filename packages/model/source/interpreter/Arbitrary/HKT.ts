import type * as fc from "fast-check";

import type { AnyEnv, Interface1, Intersection1, TaggedUnion1 } from "../../HKT";
import { getApplyConfig } from "../../HKT";

export const ArbURI = "Arbitrary";
export type ArbURI = typeof ArbURI;

export interface FastCheckEnv {
   [ArbURI]: {
      readonly module: typeof fc;
   };
}

export const accessFastCheck = <Env extends AnyEnv>(env: Env): typeof fc => (env as FastCheckEnv)[ArbURI].module;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [ArbURI]: fc.Arbitrary<A>;
   }
   interface URItoKind1<TC, A> {
      readonly [ArbURI]: fc.Arbitrary<A>;
   }
}

declare module "../../HKT" {
   interface URItoInterpreted<Env, S, R, E, A> {
      readonly [ArbURI]: (_: Env) => fc.Arbitrary<A>;
   }
   interface URItoConfig<S, R, E, A> {
      readonly [ArbURI]: fc.Arbitrary<A>;
   }
}

declare module "../../algebra/primitives" {
   interface NonEmptyArrayConfig<E, A> {
      readonly [ArbURI]: fc.Arbitrary<A>;
   }
   interface ArrayConfig<E, A> {
      readonly [ArbURI]: fc.Arbitrary<A>;
   }
}

declare module "../../algebra/object" {
   interface TypeConfig<Props> {
      readonly [ArbURI]: Interface1<Props, ArbURI>;
   }
   interface PartialConfig<Props> {
      readonly [ArbURI]: Interface1<Props, ArbURI>;
   }
   interface BothConfig<Props, PropsPartial> {
      readonly [ArbURI]: {
         required: Interface1<Props, ArbURI>;
         optional: Interface1<PropsPartial, ArbURI>;
      };
   }
}

declare module "../../algebra/newtype" {
   interface IsoConfig<E, A, N> {
      readonly [ArbURI]: fc.Arbitrary<A>;
   }
   interface PrismConfig<E, A, N> {
      readonly [ArbURI]: fc.Arbitrary<A>;
   }
}

declare module "../../algebra/record" {
   interface RecordConfig<E, A> {
      readonly [ArbURI]: fc.Arbitrary<A>;
   }
}

declare module "../../algebra/set" {
   interface SetConfig<E, A> {
      readonly [ArbURI]: fc.Arbitrary<A>;
   }
}

declare module "../../algebra/sum" {
   interface TaggedUnionConfig<Types> {
      readonly [ArbURI]: TaggedUnion1<Types, ArbURI>;
   }
   interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {
      readonly [ArbURI]: {
         readonly left: fc.Arbitrary<EA>;
         readonly right: fc.Arbitrary<AA>;
      };
   }
   interface OptionConfig<S, R, E, A> {
      readonly [ArbURI]: fc.Arbitrary<A>;
   }
}

declare module "../../algebra/nullable" {
   interface NullableConfig<S, R, E, A> {
      readonly [ArbURI]: fc.Arbitrary<A>;
   }
   interface OptionalConfig<S, R, E, A> {
      readonly [ArbURI]: fc.Arbitrary<A>;
   }
}

declare module "../../algebra/intersection" {
   interface IntersectionConfig<E, A> {
      readonly [ArbURI]: Intersection1<A, ArbURI>;
   }
}

export const applyArbitraryConfig = getApplyConfig(ArbURI);
