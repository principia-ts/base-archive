import type { IO } from '../IO/core'
import type { Exit } from './core'

import * as I from '../IO/core'
import { halt } from './core'

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export function foreachEffect_<E2, A2, R, E, A>(
  exit: Exit<E2, A2>,
  f: (a: A2) => IO<R, E, A>
): IO<R, never, Exit<E | E2, A>> {
  switch (exit._tag) {
    case 'Failure': {
      return I.succeed(halt(exit.cause))
    }
    case 'Success': {
      return I.result(f(exit.value))
    }
  }
}

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export function foreachEffect<A2, R, E, A>(
  f: (a: A2) => IO<R, E, A>
): <E2>(exit: Exit<E2, A2>) => IO<R, never, Exit<E | E2, A>> {
  return (exit) => foreachEffect_(exit, f)
}

export const mapEffect_ = <R, E, E1, A, A1>(
  exit: Exit<E, A>,
  f: (a: A) => IO<R, E1, A1>
): IO<R, never, Exit<E | E1, A1>> => {
  switch (exit._tag) {
    case 'Failure':
      return I.succeed(halt(exit.cause))
    case 'Success':
      return I.result(f(exit.value))
  }
}

export function mapEffect<R, E1, A, A1>(
  f: (a: A) => IO<R, E1, A1>
): <E>(exit: Exit<E, A>) => IO<R, never, Exit<E1 | E, A1>> {
  return (exit) => mapEffect_(exit, f)
}
