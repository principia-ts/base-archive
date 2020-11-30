import type { Lazy } from "../Function";
import { isEmpty } from "./guards";

/*
 * -------------------------------------------
 * Array Destructors
 * -------------------------------------------
 */

export function foldLeft_<A, B>(
  as: ReadonlyArray<A>,
  onNil: () => B,
  onCons: (head: A, tail: ReadonlyArray<A>) => B
): B {
  return isEmpty(as) ? onNil() : onCons(as[0], as.slice(1));
}

export function foldLeft<A, B>(
  onNil: Lazy<B>,
  onCons: (head: A, tail: ReadonlyArray<A>) => B
): (as: ReadonlyArray<A>) => B {
  return (as) => (isEmpty(as) ? onNil() : onCons(as[0], as.slice(1)));
}

export function foldRight<A, B>(
  onNil: Lazy<B>,
  onCons: (init: ReadonlyArray<A>, last: A) => B
): (as: ReadonlyArray<A>) => B {
  return (as) => (isEmpty(as) ? onNil() : onCons(as.slice(0, as.length - 1), as[as.length - 1]));
}
