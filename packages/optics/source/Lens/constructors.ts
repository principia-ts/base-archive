import * as _ from "../internal";
import type { Lens } from "./model";

/*
 * -------------------------------------------
 * Lens Constructors
 * -------------------------------------------
 */

export const id: <S>() => Lens<S, S> = _.lensId;
