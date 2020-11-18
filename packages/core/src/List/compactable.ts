import type * as E from "../Either";
import { identity } from "../Function";
import type * as O from "../Option";
import type { Separated } from "../Utils";
import { mapEither_, mapOption_ } from "./filterable";
import type { List } from "./model";

/**
 * Filter out optional values
 */
export function compact<A>(fa: List<O.Option<A>>): List<A> {
  return mapOption_(fa, identity);
}

/**
 * Splits the list into two lists. One list that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 */
export function separate<B, C>(fa: List<E.Either<B, C>>): Separated<List<B>, List<C>> {
  return mapEither_(fa, identity);
}
