import type { Either } from "../../../Either";
import * as E from "../../../Either";
import { flow } from "../../../Function";
import { chain_, pure, total } from "../_core";
import type { IO } from "../model";

/**
 *  Returns an AIO with the value on the left part.
 */
export const left = <A>(a: () => A): IO<Either<A, never>> => chain_(total(a), flow(E.left, pure));
