import type { FreeBooleanAlgebra } from "./model";

import { Value } from "./model";
import { not } from "./operations";

export function success<A>(a: A): FreeBooleanAlgebra<A> {
  return new Value(a);
}

export function failure<A>(a: A): FreeBooleanAlgebra<A> {
  return not(success(a));
}
