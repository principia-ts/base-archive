import type * as P from "@principia/prelude";
import type { Bounded } from "@principia/prelude/Bounded";
import type { Eq } from "@principia/prelude/Eq";
import * as HKT from "@principia/prelude/HKT";
import type { Ord } from "@principia/prelude/Ord";
import type { Ring } from "@principia/prelude/Ring";
import type { Show } from "@principia/prelude/Show";

import { identity, unsafeCoerce } from "../Function";
import { make } from "./constructors";
import { bimap, bimap_, contramap, first, first_, map, map_ } from "./methods";
import type { Const, URI, V } from "./model";

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const getShow = <E, A>(S: Show<E>): Show<Const<E, A>> => ({
   show: (c) => `make(${S.show(c)})`
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getEq: <E, A>(E: Eq<E>) => Eq<Const<E, A>> = identity;

/**
 * @category Instances
 * @since 1.0.0
 */
export const getOrd: <E, A>(O: Ord<E>) => Ord<Const<E, A>> = identity;

/**
 * @category Instances
 * @since 1.0.0
 */
export const getBounded: <E, A>(B: Bounded<E>) => Bounded<Const<E, A>> = identity as any;

/**
 * @category Instances
 * @since 1.0.0
 */
export const getSemigroup: <E, A>(S: P.Semigroup<E>) => P.Semigroup<Const<E, A>> = identity as any;

/**
 * @category Instances
 * @since 1.0.0
 */
export const getMonoid: <E, A>(M: P.Monoid<E>) => P.Monoid<Const<E, A>> = identity as any;

/**
 * @category Instances
 * @since 1.0.0
 */
export const getRing: <E, A>(S: Ring<E>) => Ring<Const<E, A>> = identity as any;

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApply = <E>(S: P.Semigroup<E>): P.Apply<[URI], V & HKT.Fix<"E", E>> => {
   type CE = V & HKT.Fix<"E", E>;

   const ap_: P.ApFn_<[URI], CE> = (fab, fa) => make(S.combine_(fab, fa));

   const mapBoth_: P.MapBothFn_<[URI], CE> = (fa, _, __) => unsafeCoerce(fa);

   return HKT.instance<P.Apply<[URI], CE>>({
      map_: map_,
      map,
      ap_: ap_,
      ap: (fa) => (fab) => ap_(fab, fa),
      mapBoth_: mapBoth_,
      mapBoth: (fb, f) => (fa) => mapBoth_(fa, fb, f)
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplicative = <E>(M: P.Monoid<E>) =>
   HKT.instance<P.Applicative<[URI], V & HKT.Fix<"E", E>>>({
      ...Functor,
      unit: () => make(M.nat),
      both_: (fa, fb) => make(M.combine_(fa, fb)),
      both: (fb) => (fa) => make(M.combine_(fa, fb))
   });

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor: P.Functor<[URI], V> = HKT.instance({
   map_: map_,
   map
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Contravariant: P.Contravariant<[URI], V> = HKT.instance({
   contramap,
   contramap_: (fa, f) => contramap(f)(fa)
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Bifunctor: P.Bifunctor<[URI], V> = HKT.instance({
   bimap_: bimap_,
   bimap,
   first_: first_,
   first,
   second_: map_,
   second: map
});
