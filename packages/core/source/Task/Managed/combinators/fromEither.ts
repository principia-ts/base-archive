import type { Either } from "../../../Either";
import { fail, succeed } from "../constructors";
import type { Managed } from "../model";
import { suspend } from "./suspend";

export const fromEither = <E, A>(ea: Either<E, A>): Managed<unknown, E, A> =>
   suspend(() => (ea._tag === "Left" ? fail(ea.left) : succeed(ea.right)));
