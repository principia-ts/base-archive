import * as E from "../Either";
import { fail, succeed } from "./constructors";
import { fold_, foldM_ } from "./fold";
import type { Async } from "./model";

export function absolve<R, E, E1, A>(async: Async<R, E, E.Either<E1, A>>): Async<R, E | E1, A> {
   return foldM_(async, fail, E.fold(fail, succeed));
}

export function recover<R, E, A>(async: Async<R, E, A>): Async<R, never, E.Either<E, A>> {
   return fold_(async, E.left, E.right);
}
