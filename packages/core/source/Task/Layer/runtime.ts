import { pipe } from "../../Function";
import type { Has, Region, Tag } from "../../Has";
import * as M from "../Managed";
import * as T from "../Task/_core";
import type { Runtime } from "../Task/combinators/runtime";
import { makeRuntime } from "../Task/combinators/runtime";
import * as L from "./core";
import { LayerFreshInstruction } from "./model";

/**
 * Embed the requird environment in a region
 */
export const region = <K, T>(h: Tag<Region<T, K>>) => <R, E>(_: L.Layer<R, E, T>): L.Layer<R, E, Has<Region<T, K>>> =>
   pipe(L.fromRawTask(T.asks((r: T): Has<Region<T, K>> => ({ [h.key]: r } as any))), L.andTo(_, "no-erase"));

/**
 * Converts a layer to a managed runtime
 */
export const toRuntime = <R, E, A>(_: L.Layer<R, E, A>): M.Managed<R, E, Runtime<A>> => M.map_(L.build(_), makeRuntime);

/**
 * Returns a fresh version of a potentially memoized layer,
 * note that this will override the memoMap for the layer and its children
 */
export const fresh = <R, E, A>(layer: L.Layer<R, E, A>): L.Layer<R, E, A> => new LayerFreshInstruction(layer);
