import { Bounded } from "../Bounded";
import { Eq } from "../Eq";
import { identity, unsafeCoerce } from "../Function";
import * as HKT from "../HKT";
import { Ord } from "../Ord";
import { Ring } from "../Ring";
import { Show } from "../Show";
import * as TC from "../typeclass-index";
import { Const, URI, V } from "./Const";
import { make } from "./constructors";
import { _bimap, _first, _map, bimap, contramap, first, map } from "./methods";

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
export const getSemigroup: <E, A>(
   S: TC.Semigroup<E>
) => TC.Semigroup<Const<E, A>> = identity as any;

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

   const _ap: TC.UC_ApF<[URI], CE> = (fab, fa) => make(S.concat(fab)(fa));

   const _mapBoth: TC.UC_MapBothF<[URI], CE> = (fa, _, __) => unsafeCoerce(fa);

   return HKT.instance<TC.Apply<[URI], CE>>({
      _map,
      map,
      _ap,
      ap: (fa) => (fab) => _ap(fab, fa),
      _mapBoth,
      mapBoth: (fb, f) => (fa) => _mapBoth(fa, fb, f)
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplicative = <E>(M: TC.Monoid<E>): TC.Applicative<[URI], V & HKT.Fix<"E", E>> =>
   HKT.instance({
      ...getApply(M),
      pure: () => make(M.empty),
      any: () => make(M.empty)
   });

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor: TC.Functor<[URI], V> = HKT.instance({
   _map,
   map
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Contravariant: TC.Contravariant<[URI], V> = HKT.instance({
   contramap
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Bifunctor: TC.Bifunctor<[URI], V> = HKT.instance({
   _bimap,
   bimap,
   _first,
   first,
   _second: _map,
   second: map
});
