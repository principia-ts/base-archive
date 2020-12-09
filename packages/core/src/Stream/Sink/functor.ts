import type { Chunk } from "../../Chunk";
import * as E from "../../Either";
import * as I from "../../IO";
import * as M from "../../Managed";
import type * as O from "../../Option";
import * as Push from "../Push";
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
/**
 * Effectfully transforms this sink's result.
 */
export function mapM_<R, R1, E, E1, I, L, Z, Z2>(
  self: Sink<R, E, I, L, Z>,
  f: (z: Z) => I.IO<R1, E1, Z2>
): Sink<R & R1, E | E1, I, L, Z2> {
  return new Sink(
    M.map_(self.push, (push) => {
      return (inputs: O.Option<Chunk<I>>) =>
        I.catchAll_(push(inputs), ([e, left]) =>
          E.fold_(
            e,
            (e) => Push.fail(e, left),
            (z) =>
              I.foldM_(
                f(z),
                (e: E | E1) => Push.fail(e, left),
                (z2) => Push.emit(z2, left)
              )
          )
        );
    })
  );
}

/**
 * Effectfully transforms this sink's result.
 */
export function mapM<R1, E1, Z, Z2>(f: (z: Z) => I.IO<R1, E1, Z2>) {
  return <R, E, I, L>(self: Sink<R, E, I, L, Z>) => mapM_(self, f);
}
