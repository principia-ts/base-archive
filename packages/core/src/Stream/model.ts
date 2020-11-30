import type * as HKT from "@principia/prelude/HKT";

import { pipe } from "../Function";
import * as I from "../IO";
import * as C from "../IO/Cause";
import { sequential } from "../IO/ExecutionStrategy";
import * as Ex from "../IO/Exit";
import * as XR from "../IORef";
import * as M from "../Managed";
import * as RM from "../Managed/ReleaseMap";
import type { Option } from "../Option";
import * as O from "../Option";
import * as Pull from "./Pull";

export const URI = "Stream";
export type URI = typeof URI;

export type V = HKT.V<"R", "-"> & HKT.V<"E", "+">;

/**
 * A `Stream<R, E, A>` is a description of a program that, when evaluated,
 * may emit 0 or more values of type `A`, may fail with errors of type `E`
 * and uses an environment of type `R`.
 *
 * One way to think of `Stream` is as a `IO` program that could emit multiple values.
 *
 * This data type can emit multiple `A` values through multiple calls to `next`.
 * Similarly, embedded inside every `Stream` is an IO program: `IO<R, Option<E>, ReadonlyArray<A>>`.
 * This program will be repeatedly evaluated as part of the stream execution. For
 * every evaluation, it will emit a chunk of values or end with an optional failure.
 * A failure of type `None` signals the end of the stream.
 *
 * `Stream` is a purely functional *pull* based stream. Pull based streams offer
 * inherent laziness and backpressure, relieving users of the need to manage buffers
 * between operatrs. As an optimization, `Stream` does not emit single values, but
 * rather an array of values. This allows the cost of effect evaluation to be
 * amortized.
 *
 * The last important attribute of `Stream` is resource management: it makes
 * heavy use of `Managed` to manage resources that are acquired
 * and released during the stream's lifetime.
 *
 * `Stream` forms a monad on its `A` type parameter, and has error management
 * facilities for its `E` type parameter, modeled similarly to `IO` (with some
 * adjustments for the multiple-valued nature of `Stream`). These aspects allow
 * for rich and expressive composition of streams.
 *
 * The current encoding of `Stream` is *not* safe for recursion. `Stream` programs
 * that are defined in terms of themselves will leak memory.
 *
 * Instead, recursive operators must be defined explicitly. See the definition of
 * `forever` for an example. This limitation will be lifted in the future.
 */
export class Stream<R, E, A> {
  readonly [I._U]: URI;
  readonly [I._E]: () => E;
  readonly [I._A]: () => A;
  readonly [I._R]: (_: R) => void;

  constructor(readonly proc: M.Managed<R, never, I.IO<R, Option<E>, ReadonlyArray<A>>>) {}
}

/**
 * Type aliases
 */
export type IO<A> = Stream<unknown, never, A>;
export type RIO<R, A> = Stream<R, never, A>;
export type EIO<E, A> = Stream<unknown, E, A>;

/**
 * The default chunk size used by the various combinators and constructors of [[Stream]].
 */
export const DefaultChunkSize = 4096;

/**
 * @internal
 */
export class Chain<R_, E_, O, O2> {
  constructor(
    readonly f0: (a: O) => Stream<R_, E_, O2>,
    readonly outerStream: I.IO<R_, Option<E_>, ReadonlyArray<O>>,
    readonly currOuterChunk: XR.URef<[ReadonlyArray<O>, number]>,
    readonly currInnerStream: XR.URef<I.IO<R_, Option<E_>, ReadonlyArray<O2>>>,
    readonly innerFinalizer: XR.URef<RM.Finalizer>
  ) {
    this.apply = this.apply.bind(this);
    this.closeInner = this.closeInner.bind(this);
    this.pullNonEmpty = this.pullNonEmpty.bind(this);
    this.pullOuter = this.pullOuter.bind(this);
  }

  closeInner() {
    return pipe(
      this.innerFinalizer,
      XR.getAndSet(RM.noopFinalizer),
      I.chain((f) => f(Ex.unit()))
    );
  }

  pullNonEmpty<R, E, O>(
    pull: I.IO<R, Option<E>, ReadonlyArray<O>>
  ): I.IO<R, Option<E>, ReadonlyArray<O>> {
    return pipe(
      pull,
      I.chain((os) => (os.length > 0 ? I.pure(os) : this.pullNonEmpty(pull)))
    );
  }

  pullOuter() {
    return pipe(
      this.currOuterChunk,
      XR.modify(([chunk, nextIdx]): [I.IO<R_, Option<E_>, O>, [ReadonlyArray<O>, number]] => {
        if (nextIdx < chunk.length) {
          return [I.pure(chunk[nextIdx]), [chunk, nextIdx + 1]];
        } else {
          return [
            pipe(
              this.pullNonEmpty(this.outerStream),
              I.tap((os) => this.currOuterChunk.set([os, 1])),
              I.map((os) => os[0])
            ),
            [chunk, nextIdx]
          ];
        }
      }),
      I.flatten,
      I.chain((o) =>
        I.uninterruptibleMask(({ restore }) =>
          pipe(
            I.do,
            I.bindS("releaseMap", () => RM.make),
            I.bindS("pull", ({ releaseMap }) =>
              restore(
                pipe(
                  this.f0(o).proc.io,
                  I.gives((_: R_) => [_, releaseMap] as [R_, RM.ReleaseMap]),
                  I.map(([_, x]) => x)
                )
              )
            ),
            I.tap(({ pull }) => this.currInnerStream.set(pull)),
            I.tap(({ releaseMap }) =>
              this.innerFinalizer.set((e) => M.releaseAll(e, sequential)(releaseMap))
            ),
            I.asUnit
          )
        )
      )
    );
  }

  apply(): I.IO<R_, Option<E_>, ReadonlyArray<O2>> {
    return pipe(
      this.currInnerStream.get,
      I.flatten,
      I.catchAllCause((c) =>
        pipe(
          c,
          C.sequenceCauseOption,
          O.fold(
            // The additional switch is needed to eagerly run the finalizer
            // *before* pulling another element from the outer stream.
            () =>
              pipe(
                this.closeInner(),
                I.chain(() => this.pullOuter()),
                I.chain(() =>
                  new Chain(
                    this.f0,
                    this.outerStream,
                    this.currOuterChunk,
                    this.currInnerStream,
                    this.innerFinalizer
                  ).apply()
                )
              ),
            Pull.halt
          )
        )
      )
    );
  }
}
