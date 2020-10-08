import type { Bounded } from "../Bounded";
import type { Eq } from "../Eq";
import { identity, unsafeCoerce } from "../Function";
import * as HKT from "../HKT";
import type { Ord } from "../Ord";
import type { Ring } from "../Ring";
import type { Show } from "../Show";
import type * as TC from "../typeclass-index";
import type { Const, URI, V } from "./Const";
import { make } from "./constructors";
import { bimap, bimap_, contramap, first, first_, map, map_ } from "./methods";

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
export const getSemigroup: <E, A>(S: TC.Semigroup<E>) => TC.Semigroup<Const<E, A>> = identity as any;

/**
 * @category Instances
 * @since 1.0.0
 */
export const getMonoid: <E, A>(M: TC.Monoid<E>) => TC.Monoid<Const<E, A>> = identity as any;

/**
 * @category Instances
 * @since 1.0.0
 */
export const getRing: <E, A>(S: Ring<E>) => Ring<Const<E, A>> = identity as any;

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApply = <E>(S: TC.Semigroup<E>): TC.Apply<[URI], V & HKT.Fix<"E", E>> => {
   type CE = V & HKT.Fix<"E", E>;

   const ap_: TC.UC_ApF<[URI], CE> = (fab, fa) => make(S.concat(fab)(fa));

   const mapBoth_: TC.UC_MapBothF<[URI], CE> = (fa, _, __) => unsafeCoerce(fa);

   return HKT.instance<TC.Apply<[URI], CE>>({
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
export const getApplicative = <E>(M: TC.Monoid<E>): TC.Applicative<[URI], V & HKT.Fix<"E", E>> =>
   HKT.instance({
      ...getApply(M),
      pure: () => make(M.empty)
   });

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor: TC.Functor<[URI], V> = HKT.instance({
   map_: map_,
   map
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Contravariant: TC.Contravariant<[URI], V> = HKT.instance({
   contramap,
   contramap_: (fa, f) => contramap(f)(fa)
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Bifunctor: TC.Bifunctor<[URI], V> = HKT.instance({
   bimap_: bimap_,
   bimap,
   first_: first_,
   first,
   second_: map_,
   second: map
});
