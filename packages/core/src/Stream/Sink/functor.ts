import type { Chunk } from "../../Chunk";
import * as E from "../../Either";
import * as I from "../../IO";
import * as M from "../../Managed";
import type * as O from "../../Option";
import { Sink } from "./model";

/*
 * -------------------------------------------
 * Functor Sink
 * -------------------------------------------
 */

/**
 * Transforms this sink's result.
 */
export function map_<R, E, I, L, Z, Z2>(
  sz: Sink<R, E, I, L, Z>,
  f: (z: Z) => Z2
): Sink<R, E, I, L, Z2> {
  return new Sink(
    M.map_(sz.push, (sink) => (inputs: O.Option<Chunk<I>>) =>
      I.mapError_(sink(inputs), (e) => [E.map_(e[0], f), e[1]])
    )
  );
}

/**
 * Transforms this sink's result.
 */
export function map<Z, Z2>(
  f: (z: Z) => Z2
): <R, E, I, L>(sz: Sink<R, E, I, L, Z>) => Sink<R, E, I, L, Z2> {
  return (sz) => map_(sz, f);
}
