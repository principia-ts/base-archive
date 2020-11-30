import { NoSuchElementException } from "../../GlobalExceptions";
import * as O from "../../Option";
import type { Managed } from "../_core";
import { fail, succeed } from "../constructors";
import { chain_ } from "../monad";

export function someOrFail_<R, E, A, E1>(
  ma: Managed<R, E, O.Option<A>>,
  e: () => E1
): Managed<R, E | E1, A> {
  return chain_(
    ma,
    O.fold(() => fail(e()), succeed)
  );
}

export function someOrFail<E1>(
  e: () => E1
): <R, E, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R, E | E1, A> {
  return (ma) => someOrFail_(ma, e);
}

export function someOrFailException<R, E, A>(
  ma: Managed<R, E, O.Option<A>>
): Managed<R, E | NoSuchElementException, A> {
  return someOrFail_(ma, () => new NoSuchElementException("Managed.someOrFailException"));
}
