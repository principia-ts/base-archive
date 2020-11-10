import { pipe } from "../../../Function";
import type { Option } from "../../../Option";
import { none, some } from "../../../Option";
import type { Cause } from "../../Exit/Cause";
import * as T from "../../Task";

export type Pull<R, E, O> = T.Task<R, Option<E>, ReadonlyArray<O>>;

export const end = T.fail(none());

export const fail = <E>(e: E) => T.fail(some(e));

export const halt = <E>(e: Cause<E>) => pipe(T.halt(e), T.mapError(some));

export const empty = <A>() => T.pure([] as ReadonlyArray<A>);

export const emit = <A>(a: A) => T.pure([a]);

export const emitArray = <A>(as: ReadonlyArray<A>) => T.pure(as);
