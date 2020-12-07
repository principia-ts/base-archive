import type { Chunk } from "../../Chunk";
import * as C from "../../Chunk";
import * as I from "../../IO";
import * as Ca from "../../IO/Cause";
import type { URef } from "../../IORef";
import * as Ref from "../../IORef";
import * as M from "../../Managed";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { halt } from "../constructors";
import { Stream } from "../model";
import * as Pull from "../Pull";

/**
 * Re-chunks the elements of the stream into chunks of `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN_<R, E, O>(ma: Stream<R, E, O>, n: number): Stream<R, E, O> {
  interface State<X> {
    readonly buffer: Chunk<X>;
    readonly done: boolean;
  }

  function emitOrAccumulate(
    buffer: Chunk<O>,
    done: boolean,
    ref: URef<State<O>>,
    pull: I.IO<R, Option<E>, Chunk<O>>
  ): I.IO<R, Option<E>, Chunk<O>> {
    if (buffer.length < n) {
      if (done) {
        if (C.isEmpty(buffer)) {
          return Pull.end;
        } else {
          return I.andThen_(
            ref.set({
              buffer: C.empty(),
              done: true
            }),
            Pull.emitChunk(buffer)
          );
        }
      } else {
        return I.foldM_(
          pull,
          O.fold(() => emitOrAccumulate(buffer, true, ref, pull), Pull.fail),
          (ch) => emitOrAccumulate(C.concat_(buffer, ch), false, ref, pull)
        );
      }
    } else {
      const [chunk, leftover] = C.splitAt_(buffer, n);
      return I.andThen_(ref.set({ buffer: leftover, done }), Pull.emitChunk(chunk));
    }
  }

  if (n < 1) {
    return halt(Ca.die(new Error("chunkN: n must be at least 1")));
  } else {
    return new Stream(
      M.gen(function* (_) {
        const ref = yield* _(
          Ref.make<State<O>>({ buffer: C.empty(), done: false })
        );
        const p = yield* _(ma.proc);
        return I.chain_(ref.get, (s) => emitOrAccumulate(s.buffer, s.done, ref, p));
      })
    );
  }
}

/**
 * Re-chunks the elements of the stream into chunks of `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN(n: number): <R, E, O>(ma: Stream<R, E, O>) => Stream<R, E, O> {
  return (ma) => chunkN_(ma, n);
}
