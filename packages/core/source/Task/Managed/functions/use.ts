import * as T from "../_internal/task";
import { useManaged, useManaged_ } from "../../_parallel";
import type { Managed } from "../model";

export const use = useManaged;

export const use_ = useManaged_;

/**
 * Runs the acquire and release actions and returns the result of this
 * managed effect. Note that this is only safe if the result of this managed
 * effect is valid outside its scope.
 */
export const useNow = <R, E, A>(self: Managed<R, E, A>) => use_(self, T.pure);
