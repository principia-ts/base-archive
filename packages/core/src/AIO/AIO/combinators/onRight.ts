import type { Either } from "../../../Either";
import * as T from "../_core";
import { joinEither_ } from "./join";

export function onRight<C>(): <R, E, A>(
  aio: T.AIO<R, E, A>
) => T.AIO<Either<C, R>, E, Either<C, A>> {
  return (aio) => joinEither_(T.ask<C>(), aio);
}
