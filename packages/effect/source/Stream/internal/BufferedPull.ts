import * as A from "@principia/core/Array";
import { pipe } from "@principia/core/Function";
import * as Mb from "@principia/core/Maybe";

import * as T from "../../Effect";
import * as R from "../../XRef";
import * as Pull from "./Pull";

export class BufferedPull<R, E, A> {
   constructor(
      readonly upstream: T.Effect<R, Mb.Maybe<E>, ReadonlyArray<A>>,
      readonly done: R.Ref<boolean>,
      readonly cursor: R.Ref<[ReadonlyArray<A>, number]>
   ) {}
}

export const ifNotDone = <R1, E1, A1>(fa: T.Effect<R1, Mb.Maybe<E1>, A1>) => <R, E, A>(
   self: BufferedPull<R, E, A>
): T.Effect<R1, Mb.Maybe<E1>, A1> =>
   pipe(
      self.done.get,
      T.chain((b) => (b ? Pull.end : fa))
   );

export const update = <R, E, A>(self: BufferedPull<R, E, A>) =>
   pipe(
      self,
      ifNotDone(
         pipe(
            self.upstream,
            T.foldM(
               Mb.fold(
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

export const pullElement = <R, E, A>(self: BufferedPull<R, E, A>): T.Effect<R, Mb.Maybe<E>, A> =>
   pipe(
      self,
      ifNotDone(
         pipe(
            self.cursor,
            R.modify(([c, i]): [T.Effect<R, Mb.Maybe<E>, A>, [ReadonlyArray<A>, number]] => {
               if (i >= c.length) {
                  return [
                     pipe(
                        update(self),
                        T.chain(() => pullElement(self))
                     ),
                     [[], 0]
                  ];
               } else {
                  return [T.pure(c[i]), [c, i + 1]];
               }
            }),
            T.flatten
         )
      )
   );

export const pullArray = <R, E, A>(
   self: BufferedPull<R, E, A>
): T.Effect<R, Mb.Maybe<E>, ReadonlyArray<A>> =>
   pipe(
      self,
      ifNotDone(
         pipe(
            self.cursor,
            R.modify(([chunk, idx]): [
               T.Effect<R, Mb.Maybe<E>, ReadonlyArray<A>>,
               [ReadonlyArray<A>, number]
            ] => {
               if (idx >= chunk.length) {
                  return [T._chain(update(self), () => pullArray(self)), [[], 0]];
               } else {
                  return [T.pure(A._dropLeft(chunk, idx)), [[], 0]];
               }
            }),
            T.flatten
         )
      )
   );

export const make = <R, E, A>(pull: T.Effect<R, Mb.Maybe<E>, ReadonlyArray<A>>) =>
   pipe(
      T.of,
      T.bindS("done", () => R.makeRef(false)),
      T.bindS("cursor", () => R.makeRef<[ReadonlyArray<A>, number]>([[], 0])),
      T.map(({ cursor, done }) => new BufferedPull(pull, done, cursor))
   );
