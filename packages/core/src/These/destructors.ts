import * as O from "../Option";
import { isLeft, isRight } from "./guards";
import type { These } from "./model";

/*
 * -------------------------------------------
 * These Destructors
 * -------------------------------------------
 */

export function fold_<E, A, B, C, D>(
  fa: These<E, A>,
  onLeft: (e: E) => B,
  onRight: (a: A) => C,
  onBoth: (e: E, a: A) => D
): B | C | D {
  switch (fa._tag) {
    case "Left": {
      return onLeft(fa.left);
    }
    case "Right": {
      return onRight(fa.right);
    }
    case "Both": {
      return onBoth(fa.left, fa.right);
    }
  }
}

export function fold<E, A, B, C, D>(
  onLeft: (e: E) => B,
  onRight: (a: A) => C,
  onBoth: (e: E, a: A) => D
): (fa: These<E, A>) => B | C | D {
  return (fa) => fold_(fa, onLeft, onRight, onBoth);
}

export function toTuple_<E, A>(fa: These<E, A>, e: E, a: A): readonly [E, A] {
  return isLeft(fa) ? [fa.left, a] : isRight(fa) ? [e, fa.right] : [fa.left, fa.right];
}

export function toTuple<E, A>(e: E, a: A): (fa: These<E, A>) => readonly [E, A] {
  return (fa) => toTuple_(fa, e, a);
}

export function getLeft<E, A>(fa: These<E, A>): O.Option<E> {
  return isRight(fa) ? O.none() : O.some(fa.left);
}

export function getRight<E, A>(fa: These<E, A>): O.Option<A> {
  return isLeft(fa) ? O.none() : O.some(fa.right);
}

export function getLeftOnly<E, A>(fa: These<E, A>): O.Option<E> {
  return isLeft(fa) ? O.some(fa.left) : O.none();
}

export function getRightOnly<E, A>(fa: These<E, A>): O.Option<A> {
  return isRight(fa) ? O.some(fa.right) : O.none();
}
