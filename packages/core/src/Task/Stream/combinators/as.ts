import { map_ } from "../functor";
import type { Stream } from "../model";

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as_<R, E, O, O1>(ma: Stream<R, E, O>, o1: () => O1): Stream<R, E, O1> {
   return map_(ma, () => o1());
}

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as<O1>(o1: () => O1): <R, E, O>(ma: Stream<R, E, O>) => Stream<R, E, O1> {
   return (ma) => as_(ma, o1);
}
