import * as E from "../../Either";
import { fail, succeed } from "./constructors";
import type { Stream } from "./model";
import { chain } from "./monad";

export const absolve: <R, E, A, E1>(
  stream: Stream<R, E, E.Either<E1, A>>
) => Stream<R, E | E1, A> = chain(E.fold(fail, succeed));
