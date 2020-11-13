import * as T from "../_core";
import type { Either } from "../../../Either";
import { joinEither_ } from "./join";

export function onRight<C>(): <R, E, A>(task: T.Task<R, E, A>) => T.Task<Either<C, R>, E, Either<C, A>> {
   return (task) => joinEither_(T.ask<C>(), task);
}
