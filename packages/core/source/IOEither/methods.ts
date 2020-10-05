import * as E from "../Either";
import * as EitherT from "../EitherT";

import { identity } from "../Function";
import * as I from "../IO";
import type * as TC from "../typeclass-index";
import { right } from "./constructors";
import type { IOEither, URI, V } from "./IOEither";

/*
 * -------------------------------------------
 * IOEither Methods
 * -------------------------------------------
 */

const Monad = EitherT.Monad(I.Monad);

export const pure: TC.PureF<[URI], V> = Monad.pure;

export const any: TC.AnyF<[URI], V> = Monad.any;

export const _map: TC.UC_MapF<[URI], V> = Monad._map;

export const map: TC.MapF<[URI], V> = Monad.map;

export const _ap: TC.UC_ApF<[URI], V> = Monad._ap;

export const ap: TC.ApF<[URI], V> = Monad.ap;

export const _apFirst: TC.UC_ApFirstF<[URI], V> = (fa, fb) =>
   _ap(
      _map(fa, (a) => () => a),
      fb
   );

export const apFirst: TC.ApFirstF<[URI], V> = (fb) => (fa) => _apFirst(fa, fb);

export const _apSecond: TC.UC_ApSecondF<[URI], V> = (fa, fb) =>
   _ap(
      _map(fa, () => (b) => b),
      fb
   );

export const apSecond: TC.ApSecondF<[URI], V> = (fb) => (fa) => _apSecond(fa, fb);

export const lift2: TC.Lift2F<[URI], V> = (f) => (fa) => (fb) =>
   _ap(
      _map(fa, (a) => (b) => f(a)(b)),
      fb
   );

export const _chain: TC.UC_ChainF<[URI], V> = Monad._chain;

export const chain: TC.ChainF<[URI], V> = Monad.chain;

export const _tap: TC.UC_TapF<[URI], V> = (fa, f) => _chain(fa, (a) => _map(f(a), () => a));

export const tap: TC.TapF<[URI], V> = (f) => (fa) => _tap(fa, f);

export const _bimap: TC.UC_BimapF<[URI], V> = (pab, f, g) => I._map(pab, E.bimap(f, g));

export const bimap: TC.BimapF<[URI], V> = (f, g) => (pab) => _bimap(pab, f, g);

export const _first: TC.UC_FirstF<[URI], V> = (pab, f) => I._map(pab, E.first(f));

export const first: TC.FirstF<[URI], V> = (f) => (pab) => _first(pab, f);

export const flatten: TC.FlattenF<[URI], V> = (mma) => _chain(mma, identity);

export const _mapBoth: TC.UC_MapBothF<[URI], V> = Monad._mapBoth;

export const mapBoth: TC.MapBothF<[URI], V> = Monad.mapBoth;

export const _both: TC.UC_BothF<[URI], V> = (fa, fb) => _mapBoth(fa, fb, (a, b) => [a, b]);

export const both: TC.BothF<[URI], V> = (fb) => (fa) => _both(fa, fb);

export const swap: TC.SwapF<[URI], V> = (pab) => I._map(pab, E.swap);

export const _alt: TC.UC_AltF<[URI], V> = (fa, that) => I._chain(fa, E.fold(that, right));

export const alt: TC.AltF<[URI], V> = (that) => (fa) => _alt(fa, that);
