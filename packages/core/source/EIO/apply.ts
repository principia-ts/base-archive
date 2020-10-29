import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as X from "../XPure";
import { Functor, map_ } from "./functor";
import type { EIO, URI, V } from "./model";

/*
 * -------------------------------------------
 * Apply EIO
 * -------------------------------------------
 */

export const ap_ = <E, A, G, B>(fab: EIO<G, (a: A) => B>, fa: EIO<E, A>): EIO<E | G, B> =>
   X.map_(X.both_(fab, fa), ([f, a]) => f(a));

export const ap = <E, A>(fa: EIO<E, A>) => <G, B>(fab: EIO<G, (a: A) => B>): EIO<E | G, B> => ap_(fab, fa);

export const apFirst_ = <E, A, G, B>(fa: EIO<E, A>, fb: EIO<G, B>): EIO<E | G, A> =>
   ap_(
      map_(fa, (a) => () => a),
      fb
   );

export const apFirst = <G, B>(fb: EIO<G, B>) => <E, A>(fa: EIO<E, A>): EIO<E | G, A> => apFirst_(fa, fb);

export const apSecond_ = <E, A, G, B>(fa: EIO<E, A>, fb: EIO<G, B>): EIO<E | G, B> =>
   ap_(
      map_(fa, () => (b: B) => b),
      fb
   );

export const apSecond = <G, B>(fb: EIO<G, B>) => <E, A>(fa: EIO<E, A>): EIO<E | G, B> => apSecond_(fa, fb);

export const mapBoth_: <E, A, G, B, C>(fa: EIO<E, A>, fb: EIO<G, B>, f: (a: A, b: B) => C) => EIO<E | G, C> =
   X.mapBoth_;

export const mapBoth: <A, G, B, C>(fb: EIO<G, B>, f: (a: A, b: B) => C) => <E>(fa: EIO<E, A>) => EIO<E | G, C> =
   X.mapBoth;

export const lift2 = <A, B, C, E, G>(f: (a: A) => (b: B) => C) => (fa: EIO<E, A>) => (fb: EIO<G, B>): EIO<E | G, C> =>
   ap_(
      map_(fa, (a) => (b: B) => f(a)(b)),
      fb
   );

/**
 * @category Apply
 * @since 1.0.0
 */
export const Apply: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap_: ap_,
   ap,
   mapBoth_: mapBoth_,
   mapBoth
});
