import type { Has, Tag } from "../../Has";
import * as L from "../../Layer";
import type { Effect } from "../model";

/**
 * Constructs a `Layer` from an `Effect`
 */
export const toLayerRaw: <R, E, A>(ma: Effect<R, E, A>) => L.Layer<R, E, A> = L.fromRawEffect;

/**
 * Constructs a `Layer` from an `Effect`
 */
export const toLayer: <A>(tag: Tag<A>) => <R, E>(ma: Effect<R, E, A>) => L.Layer<R, E, Has<A>> = L.fromEffect;
