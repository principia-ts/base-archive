import * as E from "@principia/core/Either";
import type { Option } from "@principia/core/Option";

import type { Cause } from "../../Cause";
import * as T from "../../Effect";

export type Push<R, E, I, L, Z> = (
   _: Option<ReadonlyArray<I>>
) => T.Effect<R, readonly [E.Either<E, Z>, ReadonlyArray<L>], void>;

export const emit = <I, Z>(z: Z, leftover: ReadonlyArray<I>): T.IO<[E.Either<never, Z>, ReadonlyArray<I>], never> =>
   T.fail([E.right(z), leftover]);

export const more = T.unit;

export const fail = <E, I>(e: E, leftover: ReadonlyArray<I>): T.IO<[E.Either<E, never>, ReadonlyArray<I>], never> =>
   T.fail([E.left(e), leftover]);

export const halt = <E>(c: Cause<E>): T.IO<[E.Either<E, never>, ReadonlyArray<never>], never> =>
   T.first_(T.halt(c), (e) => [E.left(e), []]);
