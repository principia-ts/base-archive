import * as A from "../../Array";
import * as I from "../../IO";
import * as C from "../../IO/Cause";
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
    readonly buffer: ReadonlyArray<X>;
    readonly done: boolean;
  }

  function emitOrAccumulate(
    buffer: ReadonlyArray<O>,
    done: boolean,
    ref: URef<State<O>>,
    pull: I.IO<R, Option<E>, ReadonlyArray<O>>
  ): I.IO<R, Option<E>, ReadonlyArray<O>> {
    if (buffer.length < n) {
      if (done) {
        if (A.isEmpty(buffer)) {
          return Pull.end;
        } else {
          return I.andThen_(
            ref.set({
              buffer: A.empty(),
              done: true
            }),
            Pull.emitArray(buffer)
          );
        }
      } else {
        return I.foldM_(
          pull,
          O.fold(() => emitOrAccumulate(buffer, true, ref, pull), Pull.fail),
          (ch) => emitOrAccumulate(A.concat_(buffer, ch), false, ref, pull)
        );
      }
    } else {
      const [chunk, leftover] = A.splitAt(n)(buffer);
      return I.andThen_(ref.set({ buffer: leftover, done }), Pull.emitArray(chunk));
    }
  }

  if (n < 1) {
    return halt(C.die(new Error("chunkN: n must be at least 1")));
  } else {
    return new Stream(
      M.gen(function* (_) {
        const ref = yield* _(
          Ref.make<State<O>>({ buffer: A.empty(), done: false })
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
