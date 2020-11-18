import * as A from "../../../Array";
import { pipe } from "../../../Function";
import * as O from "../../../Option";
import * as T from "../../Task";
import * as R from "../../XRef";
import * as Pull from "./Pull";

export class BufferedPull<R, E, A> {
  constructor(
    readonly upstream: T.Task<R, O.Option<E>, ReadonlyArray<A>>,
    readonly done: R.Ref<boolean>,
    readonly cursor: R.Ref<[ReadonlyArray<A>, number]>
  ) {}
}

export function ifNotDone<R1, E1, A1>(
  fa: T.Task<R1, O.Option<E1>, A1>
): <R, E, A>(self: BufferedPull<R, E, A>) => T.Task<R1, O.Option<E1>, A1> {
  return (self) =>
    pipe(
      self.done.get,
      T.chain((b) => (b ? Pull.end : fa))
    );
}

export function update<R, E, A>(self: BufferedPull<R, E, A>): T.Task<R, O.Option<E>, void> {
  return pipe(
    self,
    ifNotDone(
      pipe(
        self.upstream,
        T.foldM(
          O.fold(
            () =>
              pipe(
                self.done.set(true),
                T.chain(() => Pull.end)
              ),
            (e) => Pull.fail(e)
          ),
          (a) => self.cursor.set([a, 0])
        )
      )
    )
  );
}

export function pullElement<R, E, A>(self: BufferedPull<R, E, A>): T.Task<R, O.Option<E>, A> {
  return pipe(
    self,
    ifNotDone(
      pipe(
        self.cursor,
        R.modify(([c, i]): [T.Task<R, O.Option<E>, A>, [ReadonlyArray<A>, number]] => {
          if (i >= c.length) {
            return [
              pipe(
                update(self),
                T.chain(() => pullElement(self))
              ),
              [A.empty(), 0]
            ];
          } else {
            return [T.pure(c[i]), [c, i + 1]];
          }
        }),
        T.flatten
      )
    )
  );
}

export function pullArray<R, E, A>(
  self: BufferedPull<R, E, A>
): T.Task<R, O.Option<E>, ReadonlyArray<A>> {
  return pipe(
    self,
    ifNotDone(
      pipe(
        self.cursor,
        R.modify(([chunk, idx]): [
          T.Task<R, O.Option<E>, ReadonlyArray<A>>,
          [ReadonlyArray<A>, number]
        ] => {
          if (idx >= chunk.length) {
            return [T.chain_(update(self), () => pullArray(self)), [A.empty(), 0]];
          } else {
            return [T.pure(A.drop_(chunk, idx)), [A.empty(), 0]];
          }
        }),
        T.flatten
      )
    )
  );
}

export function make<R, E, A>(
  pull: T.Task<R, O.Option<E>, ReadonlyArray<A>>
): T.Task<unknown, never, BufferedPull<R, E, A>> {
  return pipe(
    T.do,
    T.bindS("done", () => R.make(false)),
    T.bindS("cursor", () => R.make<[ReadonlyArray<A>, number]>([A.empty(), 0])),
    T.map(({ cursor, done }) => new BufferedPull(pull, done, cursor))
  );
}
