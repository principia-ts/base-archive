import * as E from "../../../Either";
import * as L from "../../../List";
import type * as O from "../../../Option";
import type { Cause } from "../../Exit/Cause";
import type { Managed } from "../../Managed";
import * as M from "../../Managed";
import * as T from "../../Task";
import * as XR from "../../XRef";

export type Push<R, E, I, L, Z> = (_: O.Option<L.List<I>>) => T.Task<R, readonly [E.Either<E, Z>, L.List<L>], void>;

export function emit<I, Z>(z: Z, leftover: L.List<I>): T.EIO<[E.Either<never, Z>, L.List<I>], never> {
   return T.fail([E.right(z), leftover]);
}

export const more = T.unit();

export function fail<E, I>(e: E, leftover: L.List<I>): T.EIO<[E.Either<E, never>, L.List<I>], never> {
   return T.fail([E.left(e), leftover]);
}

export function halt<E>(c: Cause<E>): T.EIO<[E.Either<E, never>, L.List<never>], never> {
   return T.mapError_(T.halt(c), (e) => [E.left(e), L.empty()]);
}

export function restartable<R, E, I, L, Z>(
   sink: Managed<R, never, Push<R, E, I, L, Z>>
): Managed<R, never, readonly [Push<R, E, I, L, Z>, T.RIO<R, void>]> {
   return M.gen(function* (_) {
      const switchSink = yield* _(M.switchable<R, never, Push<R, E, I, L, Z>>());
      const initialSink = yield* _(switchSink(sink));
      const currSink = yield* _(XR.makeRef(initialSink));

      const restart = T.chain_(switchSink(sink), currSink.set);
      const push = (input: O.Option<L.List<I>>) => T.chain_(currSink.get, (f) => f(input));

      return [push, restart];
   });
}
