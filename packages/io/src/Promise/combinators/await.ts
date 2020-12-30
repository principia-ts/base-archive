import type { Promise } from '../model'

import { left, right } from '@principia/base/data/Either'

import { maybeAsyncInterrupt } from '../../IO/combinators/interrupt'
import { Pending } from '../model'
import { interruptJoiner } from './interrupt'

/**
 * Retrieves the value of the promise, suspending the fiber running the action
 * until the result is available.
 */
function wait<E, A>(promise: Promise<E, A>) {
  return maybeAsyncInterrupt<unknown, E, A>((k) => {
    const state = promise.state.get

    switch (state._tag) {
      case 'Done': {
        return right(state.value)
      }
      case 'Pending': {
        promise.state.set(new Pending([k, ...state.joiners]))
        return left(interruptJoiner(k)(promise))
      }
    }
  }, promise.blockingOn)
}

export { wait as await }
