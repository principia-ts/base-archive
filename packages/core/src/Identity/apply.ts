import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor, map_ } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Apply Identity
 * -------------------------------------------
 */

export function ap_<A, B>(fab: (a: A) => B, fa: A): B {
  return fab(fa);
}

export function ap<A>(fa: A): <B>(fab: (a: A) => B) => B {
  return (fab) => fab(fa);
}

export function apFirst_<A, B>(fa: A, fb: B): A {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  );
}

export function apFirst<B>(fb: B): <A>(fa: A) => A {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<A, B>(fa: A, fb: B): B {
  return ap_(
    map_(fa, (_) => (b: B) => b),
    fb
  );
}

export function apSecond<B>(fb: B): <A>(fa: A) => B {
  return (fa) => apSecond_(fa, fb);
}

export function zipWith_<A, B, C>(fa: A, fb: B, f: (a: A, b: B) => C): C {
  return f(fa, fb);
}

export function zipWith<A, B, C>(fb: B, f: (a: A, b: B) => C): (fa: A) => C {
  return (fa) => f(fa, fb);
}

export const Apply: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap_,
  ap,
  zipWith_,
  zipWith
});
