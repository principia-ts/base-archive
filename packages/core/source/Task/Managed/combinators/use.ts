import * as T from "../_internal/task";
import { useManaged, useManaged_ } from "../../_parallel";
import type { Managed } from "../model";

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export const use = useManaged;

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export const use_ = useManaged_;

/**
 * Runs the acquire and release actions and returns the result of this
 * managed effect. Note that this is only safe if the result of this managed
 * effect is valid outside its scope.
 */
export const useNow: <R, E, A>(ma: Managed<R, E, A>) => T.Task<R, E, A> = use(T.pure);

/**
 * Use the resource until interruption.
 * Useful for resources that you want to acquire and use as long as the application is running, like a HTTP server.
 */
export const useForever: <R, E, A>(ma: Managed<R, E, A>) => T.Task<R, E, never> = use(() => T.never);
