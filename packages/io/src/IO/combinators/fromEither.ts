import type { IO } from "../core";

import * as E from "@principia/base/data/Either";

import { fail, flatMap_, pure, total } from "../core";

/**
 * Lifts an `Either` into an `IO`
 */
export function fromEither<E, A>(f: () => E.Either<E, A>): IO<unknown, E, A> {
  return flatMap_(total(f), E.fold(fail, pure));
}
