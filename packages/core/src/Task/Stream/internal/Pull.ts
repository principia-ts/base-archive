import { pipe } from "../../../Function";
import * as L from "../../../List";
import type { Option } from "../../../Option";
import { none, some } from "../../../Option";
import type { Cause } from "../../Exit/Cause";
import * as T from "../../Task";

export type Pull<R, E, O> = T.Task<R, Option<E>, L.List<O>>;

export const end = T.fail(none());

export function fail<E>(e: E): T.EIO<Option<E>, never> {
   return T.fail(some(e));
}

export function halt<E>(e: Cause<E>): T.Task<unknown, Option<E>, never> {
   return pipe(T.halt(e), T.mapError(some));
}

export function empty<A>(): T.IO<L.List<A>> {
   return T.pure(L.empty());
}

export function emit<A>(a: A): T.IO<L.List<A>> {
   return T.pure(L.list(a));
}

export function emitArray<A>(as: ReadonlyArray<A>): T.IO<L.List<A>> {
   return T.pure(L.from(as));
}
