import * as HKT from "@principia/core/HKT";
import type {
   Applicative as _Applicative,
   Apply as _Apply,
   Functor as _Functor,
   Monad as _Monad,
   MonadFail as _MonadFail
} from "@principia/core/typeclass-index";

import { _ap, _chain, _map, _mapBoth, ap, chain, fail, map, mapBoth, pure, unit } from "./core";
import type { URI, V } from "./Effect";

export const Functor: _Functor<[URI], V> = HKT.instance({
   _map,
   map
});

export const Apply: _Apply<[URI], V> = HKT.instance({
   ...Functor,
   _ap,
   ap,
   _mapBoth,
   mapBoth
});

export const Applicative: _Applicative<[URI], V> = HKT.instance({
   ...Apply,
   pure,
   any: () => unit
});

export const Monad: _Monad<[URI], V> = HKT.instance({
   ...Applicative,
   _chain,
   chain
});

export const MonadFail: _MonadFail<[URI], V> = HKT.instance({
   ...Monad,
   fail
});
