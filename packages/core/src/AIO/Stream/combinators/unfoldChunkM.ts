import { pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as M from "../../Managed";
import * as T from "../../AIO";
import * as XR from "../../XRef";
import * as Pull from "../internal/Pull";
import { Stream } from "../model";

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldChunkM<Z>(
  z: Z
): <R, E, A>(f: (z: Z) => T.AIO<R, E, Option<readonly [ReadonlyArray<A>, Z]>>) => Stream<R, E, A> {
  return (f) =>
    new Stream(
      pipe(
        M.do,
        M.bindS("done", () => XR.makeManaged(false)),
        M.bindS("ref", () => XR.makeManaged(z)),
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
