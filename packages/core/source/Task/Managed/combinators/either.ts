import * as E from "../../../Either";
import { fold_ } from "../fold";
import type { Managed } from "../model";

export const either = <R, E, A>(ma: Managed<R, E, A>): Managed<R, never, E.Either<E, A>> => fold_(ma, E.left, E.right);
