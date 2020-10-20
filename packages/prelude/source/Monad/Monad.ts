import type { Functor, Functor1, Functor2, Functor3, Functor4, FunctorHKT } from "../Functor";
import type * as HKT from "../HKT";
import type { Unit, Unit1, Unit2, Unit3, Unit4, UnitHKT } from "../Unit";
import type { FlattenFn } from "./FlattenFn";

export interface MonadHKT<F, TC = HKT.Auto> extends FunctorHKT<F, TC>, UnitHKT<F, TC> {
   readonly flatten: <A>(mma: HKT.HKT<F, HKT.HKT<F, A>>) => HKT.HKT<F, A>;
}

export interface Monad<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C>, Unit<F, C> {
   readonly flatten: FlattenFn<F, C>;
}

export interface Monad1<F extends HKT.URIS1, TC = HKT.Auto> extends Functor1<F, TC>, Unit1<F, TC> {
   readonly flatten: <A>(mma: HKT.Kind1<F, TC, HKT.Kind1<F, TC, A>>) => HKT.Kind1<F, TC, A>;
}

export interface Monad2<F extends HKT.URIS2, TC = HKT.Auto> extends Functor2<F, TC>, Unit2<F, TC> {
   readonly flatten: <E, G, A>(
      mma: HKT.Kind2<F, TC, E, HKT.Kind2<F, TC, HKT.Intro2<TC, "E", E, G>, A>>
   ) => HKT.Kind2<F, TC, HKT.Mix2<TC, "E", [E, G]>, A>;
}

export interface Monad3<F extends HKT.URIS3, TC = HKT.Auto> extends Functor3<F, TC>, Unit3<F, TC> {
   readonly flatten: <R, E, Q, G, A>(
      mma: HKT.Kind3<F, TC, R, E, HKT.Kind3<F, TC, HKT.Intro3<TC, "R", R, Q>, HKT.Intro3<TC, "E", E, G>, A>>
   ) => HKT.Kind3<F, TC, HKT.Mix3<TC, "R", [R, Q]>, HKT.Mix3<TC, "E", [E, G]>, A>;
}

export interface Monad4<F extends HKT.URIS4, TC = HKT.Auto> extends Functor4<F, TC>, Unit4<F, TC> {
   readonly flatten: <S, R, E, U, Q, G, A>(
      mma: HKT.Kind4<
         F,
         TC,
         S,
         R,
         E,
         HKT.Kind4<F, TC, HKT.Intro4<TC, "S", S, U>, HKT.Intro4<TC, "R", R, Q>, HKT.Intro4<TC, "E", E, G>, A>
      >
   ) => HKT.Kind4<F, TC, HKT.Mix4<TC, "S", [S, U]>, HKT.Mix4<TC, "R", [R, Q]>, HKT.Mix4<TC, "E", [E, G]>, A>;
}
