import type { Either } from "../../Either";
import * as I from "../_core";
import type { IO } from "../model";
import { joinEither_ } from "./join";

export function onLeft<C>(): <R, E, A>(io: I.IO<R, E, A>) => IO<Either<R, C>, E, Either<A, C>> {
  return (io) => joinEither_(io, I.ask<C>());
}
