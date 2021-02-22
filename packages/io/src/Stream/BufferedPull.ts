import { pipe, tuple } from '@principia/base/Function'
import * as O from '@principia/base/Option'

import * as A from '../Array'
import * as I from '../IO'
import * as R from '../IORef'
import * as Pull from './Pull'

export class BufferedPull<R, E, A> {
  constructor(
    readonly upstream: I.IO<R, O.Option<E>, ReadonlyArray<A>>,
    readonly done: R.URef<boolean>,
    readonly cursor: R.URef<readonly [ReadonlyArray<A>, number]>
  ) {}
}

export function ifNotDone<R1, E1, A1>(
  fa: I.IO<R1, O.Option<E1>, A1>
): <R, E, A>(self: BufferedPull<R, E, A>) => I.IO<R1, O.Option<E1>, A1> {
  return (self) =>
    pipe(
      self.done.get,
      I.bind((b) => (b ? Pull.end : fa))
    )
}

export function update<R, E, A>(self: BufferedPull<R, E, A>): I.IO<R, O.Option<E>, void> {
  return pipe(
    self,
    ifNotDone(
      pipe(
        self.upstream,
        I.foldM(
          O.match(
            () =>
              pipe(
                self.done.set(true),
                I.bind(() => Pull.end)
              ),
            (e) => Pull.fail(e)
          ),
          (a) => self.cursor.set([a, 0])
        )
      )
    )
  )
}

export function pullElement<R, E, A>(self: BufferedPull<R, E, A>): I.IO<R, O.Option<E>, A> {
  return pipe(
    self,
    ifNotDone(
      pipe(
        self.cursor,
        R.modify(([c, i]): [I.IO<R, O.Option<E>, A>, [ReadonlyArray<A>, number]] => {
          if (i >= c.length) {
            return [
              pipe(
                update(self),
                I.bind(() => pullElement(self))
              ),
              [A.empty(), 0]
            ]
          } else {
            return [I.pure(c[i]), [c, i + 1]]
          }
        }),
        I.flatten
      )
    )
  )
}

export function pullArray<R, E, A>(self: BufferedPull<R, E, A>): I.IO<R, O.Option<E>, ReadonlyArray<A>> {
  return pipe(
    self,
    ifNotDone(
      pipe(
        self.cursor,
        R.modify(([chunk, idx]): [I.IO<R, O.Option<E>, ReadonlyArray<A>>, [ReadonlyArray<A>, number]] => {
          if (idx >= chunk.length) {
            return [I.bind_(update(self), () => pullArray(self)), [A.empty(), 0]]
          } else {
            return [I.pure(A.drop_(chunk, idx)), [A.empty(), 0]]
          }
        }),
        I.flatten
      )
    )
  )
}

export function make<R, E, A>(
  pull: I.IO<R, O.Option<E>, ReadonlyArray<A>>
): I.IO<unknown, never, BufferedPull<R, E, A>> {
  return I.gen(function* (_) {
    const done   = yield* _(R.make(false))
    const cursor = yield* _(R.make<readonly [ReadonlyArray<A>, number]>(tuple(A.empty(), 0)))
    return new BufferedPull(pull, done, cursor)
  })
}
