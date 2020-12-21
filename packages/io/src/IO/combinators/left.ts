import type { UIO } from "../core";
import type { Either } from "@principia/base/data/Either";

import * as E from "@principia/base/data/Either";
import { flow } from "@principia/base/data/Function";

import { flatMap_, pure, total } from "../core";

/**
 *  Returns an IO with the value on the left part.
 */
export const left = <A>(a: () => A): UIO<Either<A, never>> =>
  flatMap_(total(a), flow(E.left, pure));
