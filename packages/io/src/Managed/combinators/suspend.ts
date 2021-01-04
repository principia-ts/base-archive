import * as I from '../_internal/io'
import { Managed } from '../core'

export function suspend<R, E, A>(thunk: () => Managed<R, E, A>): Managed<R, E, A> {
  return new Managed(I.suspend(() => thunk().io))
}
