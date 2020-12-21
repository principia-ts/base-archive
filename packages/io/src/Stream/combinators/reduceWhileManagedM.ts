import type { IO } from "../../IO";
import type { Managed } from "../../Managed";
import type { Stream } from "../core";

import { flow } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import * as C from "../../Chunk";
import * as I from "../../IO";
import * as M from "../../Managed";

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function reduceWhileManagedM_<R, E, O, R1, E1, S>(
  ma: Stream<R, E, O>,
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => IO<R1, E1, S>
): Managed<R & R1, E | E1, S> {
  return M.chain_(ma.proc, (is) => {
    const loop = (s1: S): IO<R & R1, E | E1, S> => {
      if (!cont(s1)) return I.succeed(s1);
      else {
        return I.foldM_(
          is,
          O.fold(() => I.succeed(s1), I.fail),
          flow(C.reduceIO(s1, f), I.flatMap(loop))
        );
      }
    };
    return M.fromEffect(loop(s));
  });
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function reduceWhileManagedM<O, R1, E1, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => IO<R1, E1, S>
): <R, E>(ma: Stream<R, E, O>) => Managed<R & R1, E | E1, S> {
  return (ma) => reduceWhileManagedM_(ma, s, cont, f);
}
