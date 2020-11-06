import { flow } from "@principia/prelude";

import * as E from "../../../Either";
import { succeed } from "../constructors";
import { foldM_ } from "../fold";
import { map_ } from "../functor";
import type { Managed } from "../model";

export const orElseEither_ = <R, E, A, R1, E1, B>(
   ma: Managed<R, E, A>,
   that: () => Managed<R1, E1, B>
): Managed<R & R1, E1, E.Either<B, A>> => foldM_(ma, () => map_(that(), E.left), flow(E.right, succeed));

export const orElseEither = <R1, E1, B>(that: () => Managed<R1, E1, B>) => <R, E, A>(
   ma: Managed<R, E, A>
): Managed<R & R1, E1, E.Either<B, A>> => orElseEither_(ma, that);
