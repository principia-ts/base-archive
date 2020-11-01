import * as _ from "../internal";
import type { Optional } from "../Optional";
import type { Traversal } from "../Traversal";
import type { Lens } from "./model";

/*
 * -------------------------------------------
 * Lens Converters
 * -------------------------------------------
 */

/**
 * View a `Lens` as an `Optional`
 *
 * @category Converters
 * @since 1.0.0
 */
export const asOptional: <S, A>(sa: Lens<S, A>) => Optional<S, A> = _.lensAsOptional;

/**
 * View a `Lens` as a Traversal
 *
 * @category Converters
 * @since 1.0.0
 */
export const asTraversal: <S, A>(sa: Lens<S, A>) => Traversal<S, A> = _.lensAsTraversal;
