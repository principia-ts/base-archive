import type { IO } from "../../IO";
import * as I from "../../IO";
import * as M from "../../Managed";
import type { Stream } from "../model";
import { reduceWhileManagedM_ } from "./reduceWhileManagedM";

/**
 * Reduces the elements in the stream to a value of type `S`.
 * Stops the fold early when the condition is not fulfilled.
 */
export function reduceWhile_<R, E, O, S>(
  ma: Stream<R, E, O>,
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => S
): IO<R, E, S> {
  return M.use_(
    reduceWhileManagedM_(ma, s, cont, (s, o) => I.succeed(f(s, o))),
    I.succeed
  );
}

/**
 * Reduces the elements in the stream to a value of type `S`.
 * Stops the fold early when the condition is not fulfilled.
 */
export function reduceWhile<O, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => S
): <R, E>(ma: Stream<R, E, O>) => IO<R, E, S> {
  return (ma) => reduceWhile_(ma, s, cont, f);
}
