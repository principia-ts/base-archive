import type { Has, Tag } from "../../Has";
import * as L from "../../Layer/core";
import type { IO } from "../model";

/**
 * Constructs a `Layer` from an `IO`
 */
export const toLayerRaw: <R, E, A>(ma: IO<R, E, A>) => L.Layer<R, E, A> = L.fromRawEffect;

/**
 * Constructs a `Layer` from an `IO`
 */
export const toLayer: <A>(tag: Tag<A>) => <R, E>(ma: IO<R, E, A>) => L.Layer<R, E, Has<A>> =
  L.fromEffect;
