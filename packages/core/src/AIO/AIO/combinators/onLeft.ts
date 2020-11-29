import type { Either } from "../../../Either";
import * as T from "../_core";
import type { AIO } from "../model";
import { joinEither_ } from "./join";

export const onLeft = <C>() => <R, E, A>(aio: AIO<R, E, A>): AIO<Either<R, C>, E, Either<A, C>> =>
  joinEither_(aio, T.ask<C>());
