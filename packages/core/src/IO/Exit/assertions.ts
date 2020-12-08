import { Exit, Failure } from "./model";

export function assertFailure<E, A>(exit: Exit<E, A>): asserts exit is Failure<E> {
  if (exit._tag === "Success") {
    throw new Error("expected a Failure, but got a Success");
  }
}
