import type { Either } from "../../../Either";
import * as T from "../core";
import type { Task } from "../model";
import { joinEither_ } from "./join";

export const onRight = <C>() => <R, E, A>(task: Task<R, E, A>): Task<Either<C, R>, E, Either<C, A>> =>
   joinEither_(T.ask<C>(), task);
