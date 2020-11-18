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

export function ap_<E, A, G, B>(fab: EIO<G, (a: A) => B>, fa: EIO<E, A>): EIO<E | G, B> {
  return X.map_(X.both_(fab, fa), ([f, a]) => f(a));
}

export function ap<E, A>(fa: EIO<E, A>): <G, B>(fab: EIO<G, (a: A) => B>) => EIO<E | G, B> {
  return (fab) => ap_(fab, fa);
}

export function apFirst_<E, A, G, B>(fa: EIO<E, A>, fb: EIO<G, B>): EIO<E | G, A> {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  );
}

export function apFirst<G, B>(fb: EIO<G, B>): <E, A>(fa: EIO<E, A>) => EIO<G | E, A> {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<E, A, G, B>(fa: EIO<E, A>, fb: EIO<G, B>): EIO<E | G, B> {
  return ap_(
    map_(fa, () => (b: B) => b),
    fb
  );
}

export function apSecond<G, B>(fb: EIO<G, B>): <E, A>(fa: EIO<E, A>) => EIO<G | E, B> {
  return (fa) => apSecond_(fa, fb);
}

export const mapBoth_: <E, A, G, B, C>(
  fa: EIO<E, A>,
  fb: EIO<G, B>,
  f: (a: A, b: B) => C
) => EIO<E | G, C> = X.mapBoth_;

export const mapBoth: <A, G, B, C>(
  fb: EIO<G, B>,
  f: (a: A, b: B) => C
) => <E>(fa: EIO<E, A>) => EIO<E | G, C> = X.mapBoth;

export function lift2<A, B, C, E, G>(
  f: (a: A) => (b: B) => C
): (fa: EIO<E, A>) => (fb: EIO<G, B>) => EIO<E | G, C> {
  return (fa) => (fb) =>
    ap_(
      map_(fa, (a) => (b: B) => f(a)(b)),
      fb
    );
}

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
