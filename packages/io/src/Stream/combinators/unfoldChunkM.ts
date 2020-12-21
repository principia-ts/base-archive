import type { Chunk } from "../../Chunk";
import type { Option } from "@principia/base/data/Option";

import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import * as I from "../../IO";
import * as XR from "../../IORef";
import * as M from "../../Managed";
import { Stream } from "../core";
import * as Pull from "../Pull";

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldChunkM<Z, R, E, A>(
  z: Z,
  f: (z: Z) => I.IO<R, E, Option<readonly [Chunk<A>, Z]>>
): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bindS("done", () => XR.makeManaged(false)),
      M.bindS("ref", () => XR.makeManaged(z)),
      M.letS("pull", ({ done, ref }) =>
        pipe(
          done.get,
          I.flatMap((isDone) =>
            isDone
              ? Pull.end
              : pipe(
                  ref.get,
                  I.flatMap(f),
                  I.foldM(
                    Pull.fail,
                    O.fold(
                      () =>
                        pipe(
                          done.set(true),
                          I.flatMap(() => Pull.end)
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
