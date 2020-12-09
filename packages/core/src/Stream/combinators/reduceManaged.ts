import { constTrue } from "../../Function";
import * as I from "../../IO";
import type { Managed } from "../../Managed";
import type { Stream } from "../model";
import { reduceWhileManagedM_ } from "./reduceWhileManagedM";

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function reduceManaged_<R, E, O, S>(
  ma: Stream<R, E, O>,
  s: S,
  f: (s: S, o: O) => S
): Managed<R, E, S> {
  return reduceWhileManagedM_(ma, s, constTrue, (s, o) => I.succeed(f(s, o)));
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function reduceManaged<O, S>(
  s: S,
  f: (s: S, o: O) => S
): <R, E>(ma: Stream<R, E, O>) => Managed<R, E, S> {
  return (ma) => reduceManaged_(ma, s, f);
}
