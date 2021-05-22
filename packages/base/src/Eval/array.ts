import type { Eval } from './core'

import * as A from '../Array/core'
import * as Ev from './core'

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<A, B>(as: ReadonlyArray<A>, b: B, f: (b: B, a: A) => Eval<B>): Eval<B> {
  return A.foldl_(as, Ev.now(b), (b, a) => Ev.bind_(b, (b) => f(b, a)))
}
