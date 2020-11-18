import type { Has, Tag } from "../../../Has";
import * as L from "../../Layer/core";
import type { Task } from "../model";

/**
 * Constructs a `Layer` from an `Task`
 */
export const toLayerRaw: <R, E, A>(ma: Task<R, E, A>) => L.Layer<R, E, A> = L.fromRawTask;

/**
 * Constructs a `Layer` from an `Task`
 */
export const toLayer: <A>(tag: Tag<A>) => <R, E>(ma: Task<R, E, A>) => L.Layer<R, E, Has<A>> =
  L.fromTask;
