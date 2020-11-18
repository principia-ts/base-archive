import type { Eq } from "@principia/prelude/Eq";

import type { Predicate } from "../Function";
import type { ReadonlyRecord } from "./model";

const _hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Test whether a given record contains the given key
 *
 * @category Guards
 * @since 1.0.0
 */
export function has_<N extends string>(r: ReadonlyRecord<N, unknown>, k: string): k is N {
  return _hasOwnProperty.call(r, k);
}

/**
 * Test whether a given record contains the given key
 *
 * @category Guards
 * @since 1.0.0
 */
export function has<N extends string>(k: string, r: ReadonlyRecord<N, unknown>): k is N;
export function has<N extends string>(
  this: any,
  k: string,
  r?: ReadonlyRecord<N, unknown>
): k is N {
  return _hasOwnProperty.call(r === undefined ? this : r, k);
}

/**
 * Test whether one record contains all of the keys and values contained in another record
 *
 * @category Guards
 * @since 1.0.0
 */
export function isSubrecord_<A>(
  E: Eq<A>
): (me: ReadonlyRecord<string, A>, that: ReadonlyRecord<string, A>) => boolean {
  return (me, that) => {
    for (const k in me) {
      if (!_hasOwnProperty.call(that, k) || !E.equals(me[k])(that[k])) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Test whether one record contains all of the keys and values contained in another record
 *
 * @category Guards
 * @since 1.0.0
 */
export function isSubrecord<A>(
  E: Eq<A>
): (that: ReadonlyRecord<string, A>) => (me: ReadonlyRecord<string, A>) => boolean {
  return (that) => (me) => isSubrecord_(E)(me, that);
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function every_<N extends string, A>(
  r: ReadonlyRecord<N, A>,
  predicate: Predicate<A>
): boolean {
  for (const k in r) {
    if (!predicate(r[k])) {
      return false;
    }
  }
  return true;
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function every<A>(
  predicate: Predicate<A>
): <N extends string>(r: Readonly<Record<N, A>>) => boolean {
  return (r) => every_(r, predicate);
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function some_<N extends string, A>(
  r: ReadonlyRecord<N, A>,
  predicate: (a: A) => boolean
): boolean {
  for (const k in r) {
    if (predicate(r[k])) {
      return true;
    }
  }
  return false;
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function some<A>(
  predicate: (a: A) => boolean
): <N extends string>(r: Readonly<Record<N, A>>) => boolean {
  return (r) => some_(r, predicate);
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function elem_<A>(E: Eq<A>): <N extends string>(r: Readonly<Record<N, A>>, a: A) => boolean {
  return (r, a) => {
    for (const k in r) {
      if (E.equals(r[k])(a)) {
        return true;
      }
    }
    return false;
  };
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function elem<A>(
  E: Eq<A>
): (a: A) => <N extends string>(r: Readonly<Record<N, A>>) => boolean {
  return (a) => (r) => elem_(E)(r, a);
}
