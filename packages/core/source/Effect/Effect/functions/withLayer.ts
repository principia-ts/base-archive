import type { Layer } from "../../Layer";
import * as M from "../../Managed";
import { local_ } from "../core";
import type { Effect } from "../model";

/**
 * Provides a layer to the given effect
 */
export const withLayer_ = <R, E, A, R1, E1, A1>(
   fa: Effect<R & A1, E, A>,
   layer: Layer<R1, E1, A1>
): Effect<R & R1, E | E1, A> => M.use_(layer.build, (p) => local_(fa, (r: R & R1) => ({ ...r, ...p })));

/**
 * Provides a layer to the given effect
 */
export const withLayer = <R1, E1, A1>(layer: Layer<R1, E1, A1>) => <R, E, A>(
   fa: Effect<R & A1, E, A>
): Effect<R & R1, E | E1, A> => M.use_(layer.build, (p) => local_(fa, (r: R & R1) => ({ ...r, ...p })));
