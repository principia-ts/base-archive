import { flow } from "@principia/prelude";

import * as E from "../../../Either";
import { succeed } from "../constructors";
import { foldM_ } from "../fold";
import { map_ } from "../functor";
import type { Managed } from "../model";

export function orElseEither_<R, E, A, R1, E1, B>(
   ma: Managed<R, E, A>,
   that: () => Managed<R1, E1, B>
): Managed<R & R1, E1, E.Either<B, A>> {
   return foldM_(ma, () => map_(that(), E.left), flow(E.right, succeed));
}

export function orElseEither<R1, E1, B>(
   that: () => Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, E.Either<B, A>> {
   return (ma) => orElseEither_(ma, that);
}
