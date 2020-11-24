import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor } from "./functor";
import type { Reader, URI, V } from "./model";

/*
 * -------------------------------------------
 * Apply Reader
 * -------------------------------------------
 */

export function mapBoth_<R, A, R1, B, C>(
  fa: Reader<R, A>,
  fb: Reader<R1, B>,
  f: (a: A, b: B) => C
): Reader<R & R1, C> {
  return (r) => f(fa(r), fb(r));
}

export function mapBoth<A, R1, B, C>(
  fb: Reader<R1, B>,
  f: (a: A, b: B) => C
): <R>(fa: Reader<R, A>) => Reader<R & R1, C> {
  return (fa) => mapBoth_(fa, fb, f);
}

export function ap_<R, A, R1, B>(
  fab: Reader<R1, (a: A) => B>,
  fa: Reader<R, A>
): Reader<R & R1, B> {
  return (r) => fab(r)(fa(r));
}

export function ap<R, A>(
  fa: Reader<R, A>
): <R1, B>(fab: Reader<R1, (a: A) => B>) => Reader<R & R1, B> {
  return (fab) => ap_(fab, fa);
}

export function apFirst_<R, A, R1, B>(fa: Reader<R, A>, fb: Reader<R1, B>): Reader<R & R1, A> {
  return mapBoth_(fa, fb, (a, _) => a);
}

export function apFirst<R1, B>(fb: Reader<R1, B>): <R, A>(fa: Reader<R, A>) => Reader<R & R1, A> {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<R, A, R1, B>(fa: Reader<R, A>, fb: Reader<R1, B>): Reader<R & R1, B> {
  return mapBoth_(fa, fb, (_, b) => b);
}

export function apSecond<R1, B>(fb: Reader<R1, B>): <R, A>(fa: Reader<R, A>) => Reader<R & R1, B> {
  return (fa) => apSecond_(fa, fb);
}

export const Apply: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  mapBoth_,
  mapBoth,
  ap_,
  ap
});
