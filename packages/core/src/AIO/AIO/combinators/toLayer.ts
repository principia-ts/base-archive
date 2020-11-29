import type { Has, Tag } from "../../../Has";
import * as L from "../../Layer/core";
import type { AIO } from "../model";

/**
 * Constructs a `Layer` from an `AIO`
 */
export const toLayerRaw: <R, E, A>(ma: AIO<R, E, A>) => L.Layer<R, E, A> = L.fromRawEffect;

/**
 * Constructs a `Layer` from an `AIO`
 */
export const toLayer: <A>(tag: Tag<A>) => <R, E>(ma: AIO<R, E, A>) => L.Layer<R, E, Has<A>> =
  L.fromEffect;
