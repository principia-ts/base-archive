import type * as C from "../../Chunk";
import * as I from "../../IO";
import * as L from "../../Layer";
import * as M from "../../Managed";
import type * as O from "../../Option";
import { Sink } from "./model";

/**
 * Provides the sink with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll_<R, E, I, L, Z>(
  self: Sink<R, E, I, L, Z>,
  r: R
): Sink<unknown, E, I, L, Z> {
  return new Sink(
    M.map_(M.giveAll_(self.push, r), (push) => (i: O.Option<C.Chunk<I>>) => I.giveAll_(push(i), r))
  );
}

/**
 * Provides the sink with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll<R>(r: R) {
  return <E, I, L, Z>(self: Sink<R, E, I, L, Z>) => giveAll_(self, r);
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function gives_<R0, R, E, I, L, Z>(self: Sink<R, E, I, L, Z>, f: (r0: R0) => R) {
  return new Sink(
    M.map_(M.gives_(self.push, f), (push) => (i: O.Option<C.Chunk<I>>) => I.gives_(push(i), f))
  );
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function gives<R0, R>(f: (r0: R0) => R) {
  return <E, I, L, Z>(self: Sink<R, E, I, L, Z>) => gives_(self, f);
}

/**
 * Accesses the environment of the sink in the context of a sink.
 */
export function accessM<R, R1, E, I, L, Z>(
  f: (r: R) => Sink<R1, E, I, L, Z>
): Sink<R & R1, E, I, L, Z> {
  return new Sink(M.chain_(M.ask<R>(), (env) => f(env).push));
}

/**
 * Provides a layer to the `Managed`, which translates it to another level.
 */
export function giveLayer<R2, R>(layer: L.Layer<R2, never, R>) {
  return <E, I, L, Z>(self: Sink<R, E, I, L, Z>) => giveLayer_(self, layer);
}

/**
 * Provides a layer to the `Managed`, which translates it to another level.
 */
export function giveLayer_<R, E, I, L, Z, R2>(
  self: Sink<R, E, I, L, Z>,
  layer: L.Layer<R2, never, R>
) {
  return new Sink<R2, E, I, L, Z>(
    M.chain_(L.build(layer), (r) =>
      M.map_(M.giveAll_(self.push, r), (push) => (i: O.Option<C.Chunk<I>>) =>
        I.giveAll_(push(i), r)
      )
    )
  );
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 */
export function givesLayer<R2, R>(layer: L.Layer<R2, never, R>) {
  return <R0, E, I, L, Z>(self: Sink<R & R0, E, I, L, Z>): Sink<R0 & R2, E, I, L, Z> =>
    giveLayer(layer["+++"](L.identity<R0>()))(self);
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 */
export function givesLayer_<R0, E, I, L, Z, R2, R>(
  self: Sink<R & R0, E, I, L, Z>,
  layer: L.Layer<R2, never, R>
): Sink<R0 & R2, E, I, L, Z> {
  return givesLayer(layer)(self);
}
