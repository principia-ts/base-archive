import type { Clock } from '../../Clock'
import type { Schedule } from '../../Schedule'
import type { Stream } from '../core'
import type { Has } from '@principia/base/data/Has'

import * as E from '@principia/base/data/Either'
import * as O from '@principia/base/data/Option'

import { filterMap_ } from '../core'
import { scheduleEither_ } from './scheduleEither'

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule_<R, R1, E, O>(
  self: Stream<R, E, O>,
  schedule: Schedule<R1, O, any>
): Stream<R & R1 & Has<Clock>, E, O> {
  return filterMap_(
    scheduleEither_(self, schedule),
    E.fold(
      (_) => O.none(),
      (a) => O.some(a)
    )
  )
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule<R1, O>(schedule: Schedule<R1, O, any>) {
  return <R, E>(self: Stream<R, E, O>) => schedule_(self, schedule)
}
