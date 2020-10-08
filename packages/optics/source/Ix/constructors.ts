import { pipe } from "@principia/core/Function";
import type { Option } from "@principia/core/Option";

import type { At } from "../At";
import * as _ from "../internal";
import type { Iso } from "../Iso";
import type { Ix } from "./Ix";

/*
 * -------------------------------------------
 * Ix Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export const fromAt = <T, J, B>(at: At<T, J, Option<B>>): Ix<T, J, B> => ({
   index: (i) => _.lensComposePrism(_.prismSome<B>())(at.at(i))
});

/**
 * @category Constructors
 * @since 1.0.0
 */
export const fromIso = <T, S>(iso: Iso<T, S>) => <I, A>(sia: Ix<S, I, A>): Ix<T, I, A> => ({
   index: (i) => pipe(iso, _.isoAsOptional, _.optionalComposeOptional(sia.index(i)))
});

/**
 * @category Constructors
 * @since 1.0.0
 */
export const indexArray = _.indexArray;

/**
 * @category Constructors
 * @since 1.0.0
 */
export const indexRecord = _.indexRecord;
