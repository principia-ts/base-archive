import type { Stream } from '../core'

import { flow } from '@principia/base/data/Function'
import { snd } from '@principia/base/data/Tuple'

import * as I from '../../IO'
import * as M from '../../Managed'
import { fromQueueWithShutdown } from '../core'
import { distributedWithDynamic_ } from './distributedWithDynamic'
import { flattenExitOption } from './flattenExitOption'

export function broadcastDynamic_<R, E, O>(
  stream: Stream<R, E, O>,
  maximumLag: number
): M.Managed<R, never, I.UIO<Stream<unknown, E, O>>> {
  return M.map_(
    M.map_(
      distributedWithDynamic_(
        stream,
        maximumLag,
        (_) => I.succeed((_) => true),
        (_) => I.unit()
      ),
      I.map(snd)
    ),
    I.map(flow(fromQueueWithShutdown, flattenExitOption))
  )
}

export function broadcastDynamic(
  maximumLag: number
): <R, E, O>(stream: Stream<R, E, O>) => M.Managed<R, never, I.UIO<Stream<unknown, E, O>>> {
  return (stream) => broadcastDynamic_(stream, maximumLag)
}
