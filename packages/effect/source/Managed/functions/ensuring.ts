import * as T from "../_internal/effect";
import { Managed } from "../Managed";
import { _onExit } from "./onExit";

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see [[onExit]].
 */
export const _ensuring = <R, E, A, R1>(self: Managed<R, E, A>, f: T.Effect<R1, never, any>) =>
   _onExit(self, () => f);

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see [[onExit]].
 */
export const ensuring = <R1>(f: T.Effect<R1, never, any>) => <R, E, A>(self: Managed<R, E, A>) =>
   _ensuring(self, f);
