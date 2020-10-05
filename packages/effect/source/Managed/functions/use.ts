import * as T from "../_internal/effect";
import { _useManaged, useManaged } from "../../Parallel";
import { Managed } from "../Managed";

export const use = useManaged;

export const _use = _useManaged;

/**
 * Runs the acquire and release actions and returns the result of this
 * managed effect. Note that this is only safe if the result of this managed
 * effect is valid outside its scope.
 */
export const useNow = <R, E, A>(self: Managed<R, E, A>) => _use(self, T.pure);
