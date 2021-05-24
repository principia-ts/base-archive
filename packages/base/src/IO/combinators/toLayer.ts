// tracing: off

import type { Has, Tag } from '../../Has'
import type { IO } from '../core'

import * as L from '../../Layer/core'

/**
 * Constructs a `Layer` from an `IO`
 */
export const toLayerRaw: <R, E, A>(ma: IO<R, E, A>) => L.Layer<R, E, A> = L.fromRawEffect

/**
 * Constructs a `Layer` from an `IO`
 */
export const toLayer: <A>(tag: Tag<A>) => <R, E>(ma: IO<R, E, A>) => L.Layer<R, E, Has<A>> = L.fromEffect
