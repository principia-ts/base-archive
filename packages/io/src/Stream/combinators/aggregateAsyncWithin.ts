import type { Chunk } from '../../Chunk'
import type { HasClock } from '../../Clock'
import type { Schedule } from '../../Schedule'
import type { Stream } from '../core'
import type { Transducer } from '../Transducer'

import * as E from '@principia/base/data/Either'
import * as O from '@principia/base/data/Option'

import { filterMap_ } from '../core'
import { aggregateAsyncWithinEither_ } from './aggregateAsyncWithinEither'

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin<O, R1, E1, P>(
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, Chunk<P>, any>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1 & HasClock, E | E1, P> {
  return (stream) => aggregateAsyncWithin_(stream, transducer, schedule)
}

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin_<R, E, O, R1, E1, P>(
  stream: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, Chunk<P>, any>
): Stream<R & R1 & HasClock, E | E1, P> {
  return filterMap_(
    aggregateAsyncWithinEither_(stream, transducer, schedule),
    E.fold(() => O.none(), O.some)
  )
}
