import * as A from "../Array";
import { pipe } from "../Function";
import * as I from "../IO";
import type { Cause } from "../IO/Cause";
import type { Option } from "../Option";
import { none, some } from "../Option";

export type Pull<R, E, O> = I.IO<R, Option<E>, ReadonlyArray<O>>;

export const end = I.fail(none());

export function fail<E>(e: E): I.FIO<Option<E>, never> {
  return I.fail(some(e));
}

export function halt<E>(e: Cause<E>): I.IO<unknown, Option<E>, never> {
  return pipe(I.halt(e), I.mapError(some));
}

export function empty<A>(): I.UIO<ReadonlyArray<A>> {
  return I.pure(A.empty());
}

export function emit<A>(a: A): I.UIO<ReadonlyArray<A>> {
  return I.pure([a]);
}

export function emitArray<A>(as: ReadonlyArray<A>): I.UIO<ReadonlyArray<A>> {
  return I.pure(A.from(as));
}
