import * as A from "../../../Array";
import * as E from "../../../Either";
import type * as O from "../../../Option";
import type { Cause } from "../../Exit/Cause";
import type { Managed } from "../../Managed";
import * as M from "../../Managed";
import * as T from "../../AIO";
import * as XR from "../../XRef";

export type Push<R, E, I, L, Z> = (
  _: O.Option<ReadonlyArray<I>>
) => T.AIO<R, readonly [E.Either<E, Z>, ReadonlyArray<L>], void>;

export function emit<I, Z>(
  z: Z,
  leftover: ReadonlyArray<I>
): T.EIO<[E.Either<never, Z>, ReadonlyArray<I>], never> {
  return T.fail([E.right(z), leftover]);
}

export const more = T.unit();

export function fail<E, I>(
  e: E,
  leftover: ReadonlyArray<I>
): T.EIO<[E.Either<E, never>, ReadonlyArray<I>], never> {
  return T.fail([E.left(e), leftover]);
}

export function halt<E>(c: Cause<E>): T.EIO<[E.Either<E, never>, ReadonlyArray<never>], never> {
  return T.mapError_(T.halt(c), (e) => [E.left(e), A.empty()]);
}

export function restartable<R, E, I, L, Z>(
  sink: Managed<R, never, Push<R, E, I, L, Z>>
): Managed<R, never, readonly [Push<R, E, I, L, Z>, T.RIO<R, void>]> {
  return M.gen(function* (_) {
    const switchSink = yield* _(M.switchable<R, never, Push<R, E, I, L, Z>>());
    const initialSink = yield* _(switchSink(sink));
    const currSink = yield* _(XR.make(initialSink));

    const restart = T.chain_(switchSink(sink), currSink.set);
    const push = (input: O.Option<ReadonlyArray<I>>) => T.chain_(currSink.get, (f) => f(input));

    return [push, restart];
  });
}
