import { pipe } from "../../Function";
import type { Has, Region, Tag } from "../Has";
import * as M from "../Managed";
import * as T from "../Task/core";
import type { Runtime } from "../Task/functions/runtime";
import { makeRuntime } from "../Task/functions/runtime";
import * as XRM from "../XRefM";
import * as L from ".";

/**
 * Embed the requird environment in a region
 */
export const region = <K, T>(h: Tag<Region<T, K>>) => <R, E>(_: L.Layer<R, E, T>): L.Layer<R, E, Has<Region<T, K>>> =>
   pipe(L.fromRawTask(T.asks((r: T): Has<Region<T, K>> => ({ [h.key]: r } as any))), L.consuming(_));

/**
 * Converts a layer to a managed runtime
 */
export const toRuntime = <R, E, A>(_: L.Layer<R, E, A>): M.Managed<R, E, Runtime<A>> => M.map_(_.build, makeRuntime);

/**
 * A default memoMap is included in DefaultEnv,
 * this can be used to "scope" a portion of layers to use a different memo map
 */
export const memoMap = L.create(L.HasMemoMap).fromTask(
   pipe(
      XRM.makeRefM<ReadonlyMap<L.Layer<any, any, any>, readonly [T.IO<any, any>, M.Finalizer]>>(new Map()),
      T.map((ref) => new L.MemoMap(ref))
   )
);

/**
 * Returns a fresh version of a potentially memoized layer,
 * note that this will override the memoMap for the layer and its children
 */
export const fresh = <R, E, A>(layer: L.Layer<R, E, A>): L.Layer<R, E, A> => pipe(layer, L.consuming(memoMap));
