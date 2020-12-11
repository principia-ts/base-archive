import { constTrue } from "../../Function";
import type { IO } from "../../IO";
import * as I from "../../IO";
import * as M from "../../Managed";
import type { Stream } from "../model";
import { reduceWhileManagedM_ } from "./reduceWhileManagedM";

/**
 * Executes a pure fold over the stream of values - reduces all elements in the stream to a value of type `S`.
 */
export function reduce_<R, E, O, S>(ma: Stream<R, E, O>, s: S, f: (s: S, o: O) => S): IO<R, E, S> {
  return M.use_(
    reduceWhileManagedM_(ma, s, constTrue, (s, o) => I.succeed(f(s, o))),
    I.succeed
  );
}

/**
 * Executes a pure fold over the stream of values - reduces all elements in the stream to a value of type `S`.
 */
export function reduce<O, S>(
  s: S,
  f: (s: S, o: O) => S
): <R, E>(ma: Stream<R, E, O>) => IO<R, E, S> {
  return (ma) => reduce_(ma, s, f);
}
