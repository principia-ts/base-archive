import type { IO } from "../core";
import type { Either } from "@principia/base/data/Either";

import * as I from "../core";
import { joinEither_ } from "./join";

export function onLeft<C>(): <R, E, A>(io: I.IO<R, E, A>) => IO<Either<R, C>, E, Either<A, C>> {
  return (io) => joinEither_(io, I.ask<C>());
}
