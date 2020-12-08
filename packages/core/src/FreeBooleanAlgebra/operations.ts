import * as B from "../Boolean";
import type { Eq } from "../Eq";
import { pipe } from "../Function";
import { isAnd, isNot, isOr, isValue } from "./guards";
import type { FreeBooleanAlgebra } from "./model";
import { And, Not, Or } from "./model";

export function and_<A>(
  left: FreeBooleanAlgebra<A>,
  right: FreeBooleanAlgebra<A>
): FreeBooleanAlgebra<A> {
  return new And(left, right);
}

export function and<A>(
  right: FreeBooleanAlgebra<A>
): (left: FreeBooleanAlgebra<A>) => FreeBooleanAlgebra<A> {
  return (left) => and_(left, right);
}

export function or_<A>(
  left: FreeBooleanAlgebra<A>,
  right: FreeBooleanAlgebra<A>
): FreeBooleanAlgebra<A> {
  return new Or(left, right);
}

export function or<A>(
  right: FreeBooleanAlgebra<A>
): (left: FreeBooleanAlgebra<A>) => FreeBooleanAlgebra<A> {
  return (left) => or_(left, right);
}

export function not<A>(ba: FreeBooleanAlgebra<A>): FreeBooleanAlgebra<A> {
  return new Not(ba);
}

export function implies_<A>(
  left: FreeBooleanAlgebra<A>,
  right: FreeBooleanAlgebra<A>
): FreeBooleanAlgebra<A> {
  return pipe(not(left), or(right));
}

export function implies<A>(
  right: FreeBooleanAlgebra<A>
): (left: FreeBooleanAlgebra<A>) => FreeBooleanAlgebra<A> {
  return (left) => implies_(left, right);
}

export function iff_<A>(
  left: FreeBooleanAlgebra<A>,
  right: FreeBooleanAlgebra<A>
): FreeBooleanAlgebra<A> {
  return pipe(left, implies(right), and(pipe(right, implies(left))));
}

export function iff<A>(
  right: FreeBooleanAlgebra<A>
): (left: FreeBooleanAlgebra<A>) => FreeBooleanAlgebra<A> {
  return (left) => iff_(left, right);
}

export function doubleNegative<A>(
  E: Eq<A>
): (left: FreeBooleanAlgebra<A>, right: FreeBooleanAlgebra<A>) => boolean {
  return (left, right) => {
    if (isValue(left) && isNot(right) && isNot(right.result) && isValue(right.result.result)) {
      return E.equals_(left.value, right.result.result.value);
    }
    return false;
  };
}

export function symmetric<A>(f: (a1: A, a2: A) => boolean): (a1: A, a2: A) => boolean {
  return (a1, a2) => f(a1, a2) || f(a2, a1);
}

export function deMorganLaws_<A>(
  E: Eq<A>
): (left: FreeBooleanAlgebra<A>, right: FreeBooleanAlgebra<A>) => boolean {
  return (left, right) => {
    switch (left._tag) {
      case "And": {
        if (
          isNot(left.left) &&
          isNot(left.right) &&
          isValue(left.left.result) &&
          isValue(left.right.result) &&
          isNot(right) &&
          isOr(right.result) &&
          isValue(right.result.left) &&
          isValue(right.result.right)
        ) {
          return B.and_(
            E.equals_(left.left.result.value, right.result.left.value),
            E.equals_(left.right.result.value, right.result.right.value)
          );
        } else {
          return false;
        }
      }
      case "Or": {
        if (
          isNot(left.left) &&
          isValue(left.left.result) &&
          isNot(left.right) &&
          isValue(left.right.result) &&
          isNot(right) &&
          isAnd(right.result) &&
          isValue(right.result.left) &&
          isValue(right.result.right)
        ) {
          return B.and_(
            E.equals_(left.left.result.value, right.result.left.value),
            E.equals_(left.right.result.value, right.result.right.value)
          );
        } else {
          return false;
        }
      }
      case "Not": {
        if (
          isOr(left.result) &&
          isValue(left.result.left) &&
          isValue(left.result.right) &&
          isAnd(right) &&
          isNot(right.left) &&
          isValue(right.left.result) &&
          isNot(right.right) &&
          isValue(right.right.result)
        ) {
          return B.and_(
            E.equals_(left.result.left.value, right.left.result.value),
            E.equals_(left.result.right.value, right.right.result.value)
          );
        } else if (
          isAnd(left.result) &&
          isValue(left.result.left) &&
          isValue(left.result.right) &&
          isOr(right) &&
          isNot(right.left) &&
          isValue(right.left.result) &&
          isNot(right.right) &&
          isValue(right.right.result)
        ) {
          return B.and_(
            E.equals_(left.result.left.value, right.left.result.value),
            E.equals_(left.result.right.value, right.right.result.value)
          );
        } else {
          return false;
        }
      }
      default:
        return false;
    }
  };
}
