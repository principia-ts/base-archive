import type { Has } from '@principia/base/Has'
import type { Erase } from '@principia/base/util/types'
import type { IO } from '@principia/io/IO'
import type { IOEnv } from '@principia/io/IOEnv'
import type { Layer } from '@principia/io/Layer'

import { pipe } from '@principia/base/Function'
import { tag } from '@principia/base/Has'
import * as I from '@principia/io/IO'
import * as L from '@principia/io/Layer'
import * as M from '@principia/io/Managed'

export const LiveTag = tag<Live>()

export abstract class Live {
  abstract provide<E, A>(io: IO<IOEnv, E, A>): IO<unknown, E, A>

  static default: Layer<IOEnv, never, Has<Live>> = L.fromManaged(LiveTag)(
    M.asks((ioenv) => {
      return new (class extends Live {
        provide<E, A>(io: IO<IOEnv, E, A>): IO<unknown, E, A> {
          return I.giveAll_(io, ioenv)
        }
      })()
    })
  )

  static live<E, A>(io: IO<IOEnv, E, A>): IO<Has<Live>, E, A> {
    return I.asksServiceM(LiveTag)((live) => live.provide(io))
  }
}

export function withLive_<R, E, A, E1, B>(
  io: IO<R, E, A>,
  f: (_: IO<unknown, E, A>) => IO<IOEnv, E1, B>
): IO<Erase<R, Has<Live>>, E | E1, B> {
  return pipe(
    I.ask<R & Has<Live>>(),
    I.bind((r) => Live.live(f(I.giveAll_(io, r))))
  ) as any
}

export function withLive<E, A, E1, B>(
  f: (_: IO<unknown, E, A>) => IO<IOEnv, E1, B>
): <R>(io: IO<R, E, A>) => IO<Erase<R, Has<Live>>, E | E1, B> {
  return (io) => withLive_(io, f)
}
