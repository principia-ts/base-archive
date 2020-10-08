import { pipe } from "@principia/core/Function";
import type { Option } from "@principia/core/Option";
import { none, some } from "@principia/core/Option";

import type { Cause } from "../../Cause";
import * as T from "../../Effect";

export type Pull<R, E, O> = T.Effect<R, Option<E>, ReadonlyArray<O>>;

export const end = T.fail(none());

export const fail = <E>(e: E) => T.fail(some(e));

export const halt = <E>(e: Cause<E>) => pipe(T.halt(e), T.first(some));

export const empty = <A>() => T.pure([] as ReadonlyArray<A>);

export const emit = <A>(a: A) => T.pure([a]);

export const emitArray = <A>(as: ReadonlyArray<A>) => T.pure(as);
