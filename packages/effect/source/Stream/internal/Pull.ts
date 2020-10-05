import { pipe } from "@principia/core/Function";
import { just, Maybe, nothing } from "@principia/core/Maybe";

import { Cause } from "../../Cause";
import * as T from "../../Effect";

export type Pull<R, E, O> = T.Effect<R, Maybe<E>, ReadonlyArray<O>>;

export const end = T.fail(nothing());

export const fail = <E>(e: E) => T.fail(just(e));

export const halt = <E>(e: Cause<E>) => pipe(T.halt(e), T.first(just));

export const empty = <A>() => T.pure([] as ReadonlyArray<A>);

export const emit = <A>(a: A) => T.pure([a]);

export const emitArray = <A>(as: ReadonlyArray<A>) => T.pure(as);
