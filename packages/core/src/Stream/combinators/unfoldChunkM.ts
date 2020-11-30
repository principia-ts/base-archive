import { pipe } from "../../Function";
import * as I from "../../IO";
import * as XR from "../../IORef";
import * as M from "../../Managed";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { Stream } from "../model";
import * as Pull from "../Pull";

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldChunkM<Z>(
  z: Z
): <R, E, A>(f: (z: Z) => I.IO<R, E, Option<readonly [ReadonlyArray<A>, Z]>>) => Stream<R, E, A> {
  return (f) =>
    new Stream(
      pipe(
        M.do,
        M.bindS("done", () => XR.makeManaged(false)),
        M.bindS("ref", () => XR.makeManaged(z)),
        M.letS("pull", ({ done, ref }) =>
          pipe(
            done.get,
            I.chain((isDone) =>
              isDone
                ? Pull.end
                : pipe(
                    ref.get,
                    I.chain(f),
                    I.foldM(
                      Pull.fail,
                      O.fold(
                        () =>
                          pipe(
                            done.set(true),
                            I.chain(() => Pull.end)
                          ),
                        ([a, z]) =>
                          pipe(
                            ref.set(z),
                            I.map(() => a)
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
