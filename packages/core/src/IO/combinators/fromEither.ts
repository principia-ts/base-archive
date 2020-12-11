import * as E from "../../Either";
import { chain_, fail, pure, total } from "../_core";
import type { IO } from "../model";

/**
 * Lifts an `Either` into an `IO`
 */
export function fromEither<E, A>(f: () => E.Either<E, A>): IO<unknown, E, A> {
  return chain_(total(f), E.fold(fail, pure));
}
