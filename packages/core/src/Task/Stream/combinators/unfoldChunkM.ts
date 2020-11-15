import { pipe } from "../../../Function";
import type * as L from "../../../List";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as M from "../../Managed";
import * as T from "../../Task";
import * as XR from "../../XRef";
import * as Pull from "../internal/Pull";
import { Stream } from "../model";

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldChunkM<Z>(
   z: Z
): <R, E, A>(f: (z: Z) => T.Task<R, E, Option<readonly [L.List<A>, Z]>>) => Stream<R, E, A> {
   return (f) =>
      new Stream(
         pipe(
            M.do,
            M.bindS("done", () => XR.makeManagedRef(false)),
            M.bindS("ref", () => XR.makeManagedRef(z)),
            M.letS("pull", ({ done, ref }) =>
               pipe(
                  done.get,
                  T.chain((isDone) =>
                     isDone
                        ? Pull.end
                        : pipe(
                             ref.get,
                             T.chain(f),
                             T.foldM(
                                Pull.fail,
                                O.fold(
                                   () =>
                                      pipe(
                                         done.set(true),
                                         T.chain(() => Pull.end)
                                      ),
                                   ([a, z]) =>
                                      pipe(
                                         ref.set(z),
                                         T.map(() => a)
                                      )
                                )
                             )
                          )
                  )
               )
            ),
            M.map(({ pull }) => pull)
         )
      );
}
