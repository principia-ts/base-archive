import type { Either } from "@principia/core/Either";
import * as E from "@principia/core/Either";
import { flow } from "@principia/core/Function";

import { chain_, pure, total } from "../core";
import type { UIO } from "../Effect";

/**
 *  Returns an effect with the value on the left part.
 */
export const left = <A>(a: () => A): UIO<Either<A, never>> => chain_(total(a), flow(E.left, pure));
