import type { Has } from '@principia/base/Has'
import type { IO, UIO, URIO } from '@principia/io/IO'
import type { Layer } from '@principia/io/Layer'

import { pipe } from '@principia/base/Function'
import { tag } from '@principia/base/Has'
import * as FR from '@principia/io/FiberRef'
import * as I from '@principia/io/IO'
import * as L from '@principia/io/Layer'

export abstract class Sized {
  abstract readonly size: UIO<number>
  abstract withSize(size: number): <R, E, A>(io: IO<R, E, A>) => IO<R, E, A>

  static get size(): URIO<Has<Sized>, number> {
    return I.asksServiceM(SizedTag)((_) => _.size)
  }
  static withSize(size: number) {
    return <R, E, A>(io: IO<R, E, A>): IO<R & Has<Sized>, E, A> => I.asksServiceM(SizedTag)((_) => _.withSize(size)(io))
  }

  static live(size: number): Layer<unknown, never, Has<Sized>> {
    return L.fromEffect(SizedTag)(
      pipe(
        FR.make(size),
        I.map(
          (fiberRef) =>
            new (class extends Sized {
              size = FR.get(fiberRef)
              withSize(size: number) {
                return <R, E, A>(io: IO<R, E, A>) => FR.locally_(fiberRef, size, io)
              }
            })()
        )
      )
    )
  }
}
export const SizedTag = tag(Sized)
