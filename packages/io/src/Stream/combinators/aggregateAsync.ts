import type { HasClock } from '../../Clock'
import type { Stream } from '../core'
import type { Transducer } from '../Transducer'

import * as Sc from '../../Schedule'
import { aggregateAsyncWithin_ } from './aggregateAsyncWithin'

/**
 * Aggregates elements of this stream using the provided sink for as long
 * as the downstream operators on the stream are busy.
 *
 * This operator divides the stream into two asynchronous "islands". Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Whenever
 * the downstream fiber is busy processing elements, the upstream fiber will feed elements
 * into the sink until it signals completion.
 *
 * Any transducer can be used here, but see `Transducer.foldWeightedM` and `Transducer.foldUntilM` for
 * transducers that cover the common usecases.
 */
export function aggregateAsync<O, R1, E1, P>(
  transducer: Transducer<R1, E1, O, P>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1 & HasClock, E | E1, P> {
  return (stream) => aggregateAsync_(stream, transducer)
}

/**
 * Aggregates elements of this stream using the provided sink for as long
 * as the downstream operators on the stream are busy.
 *
 * This operator divides the stream into two asynchronous "islands". Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Whenever
 * the downstream fiber is busy processing elements, the upstream fiber will feed elements
 * into the sink until it signals completion.
 *
 * Any transducer can be used here, but see `Transducer.foldWeightedM` and `Transducer.foldUntilM` for
 * transducers that cover the common usecases.
 */
export function aggregateAsync_<R, E, O, R1, E1, P>(
  stream: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>
): Stream<R & R1 & HasClock, E | E1, P> {
  return aggregateAsyncWithin_(stream, transducer, Sc.forever)
}
