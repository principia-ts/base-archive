import { pipe } from "../Function";
import type { Has, Region, Tag } from "../Has";
import * as I from "../IO/_core";
import type { Runtime } from "../IO/combinators/runtime";
import { makeRuntime } from "../IO/combinators/runtime";
import * as M from "../Managed";
import * as L from "./core";
import { LayerFreshInstruction } from "./core";

/**
 * Embed the requird environment in a region
 */
export function region<K, T>(
  h: Tag<Region<T, K>>
): <R, E>(_: L.Layer<R, E, T>) => L.Layer<R, E, Has<Region<T, K>>> {
  return (_) =>
    pipe(
      L.fromRawEffect(I.asks((r: T): Has<Region<T, K>> => ({ [h.key]: r } as any))),
      L.andTo(_, "no-erase")
    );
}

/**
 * Converts a layer to a managed runtime
 */
export function toRuntime<R, E, A>(_: L.Layer<R, E, A>): M.Managed<R, E, Runtime<A>> {
  return M.map_(L.build(_), makeRuntime);
}

/**
 * Returns a fresh version of a potentially memoized layer,
 * note that this will override the memoMap for the layer and its children
 */
export function fresh<R, E, A>(layer: L.Layer<R, E, A>): L.Layer<R, E, A> {
  return new LayerFreshInstruction(layer);
}
