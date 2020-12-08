import type { FreeBooleanAlgebra } from "./model";
import { Value } from "./model";

export function success<A>(a: A): FreeBooleanAlgebra<A> {
  return new Value(a);
}
