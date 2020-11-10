import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor, map_ } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Apply Identity
 * -------------------------------------------
 */

export const ap_ = <A, B>(fab: (a: A) => B, fa: A): B => fab(fa);

export const ap = <A>(fa: A) => <B>(fab: (a: A) => B): B => fab(fa);

export const apFirst_ = <A, B>(fa: A, fb: B): A =>
   ap_(
      map_(fa, (a) => () => a),
      fb
   );

export const apFirst = <B>(fb: B) => <A>(fa: A): A => apFirst_(fa, fb);

export const apSecond_ = <A, B>(fa: A, fb: B): B =>
   ap_(
      map_(fa, (_) => (b: B) => b),
      fb
   );

export const apSecond = <B>(fb: B) => <A>(fa: A): B => apSecond_(fa, fb);

export const mapBoth_ = <A, B, C>(fa: A, fb: B, f: (a: A, b: B) => C): C => f(fa, fb);

export const mapBoth = <A, B, C>(fb: B, f: (a: A, b: B) => C) => (fa: A): C => f(fa, fb);

export const Apply: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap_: ap_,
   ap,
   mapBoth_: mapBoth_,
   mapBoth
});
