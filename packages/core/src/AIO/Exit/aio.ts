import type { AIO } from "../AIO";
import * as T from "../AIO/_core";
import { failure } from "./constructors";
import type { Exit } from "./model";

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export function foreachAIO_<E2, A2, R, E, A>(
  exit: Exit<E2, A2>,
  f: (a: A2) => AIO<R, E, A>
): AIO<R, never, Exit<E | E2, A>> {
  switch (exit._tag) {
    case "Failure": {
      return T.pure(failure(exit.cause));
    }
    case "Success": {
      return T.result(f(exit.value));
    }
  }
}

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export function foreachAIO<A2, R, E, A>(
  f: (a: A2) => AIO<R, E, A>
): <E2>(exit: Exit<E2, A2>) => AIO<R, never, Exit<E | E2, A>> {
  return (exit) => foreachAIO_(exit, f);
}

export const mapAIO_ = <R, E, E1, A, A1>(
  exit: Exit<E, A>,
  f: (a: A) => AIO<R, E1, A1>
): AIO<R, never, Exit<E | E1, A1>> => {
  switch (exit._tag) {
    case "Failure":
      return T.pure(failure(exit.cause));
    case "Success":
      return T.result(f(exit.value));
  }
};

export function mapAIO<R, E1, A, A1>(
  f: (a: A) => AIO<R, E1, A1>
): <E>(exit: Exit<E, A>) => AIO<R, never, Exit<E1 | E, A1>> {
  return (exit) => mapAIO_(exit, f);
}
