import * as A from "../../Array";
import * as E from "../../Either";
import { flow, identity, pipe } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import type { Exit } from "../Exit";
import type { Cause } from "../Exit/Cause";
import * as C from "../Exit/Cause";
import * as M from "../Managed";
import * as Semaphore from "../Semaphore";
import * as T from "../Task";
import * as XP from "../XPromise";
import * as XQ from "../XQueue";
import * as XR from "../XRef";
import { fromArray, fromTask, managed, repeatTaskChunkOption } from "./constructors";
import { foreachManaged } from "./destructors";
import * as BPull from "./internal/BufferedPull";
import * as Pull from "./internal/Pull";
import * as Take from "./internal/Take";
import type { RIO, UIO } from "./model";
import { Chain, Stream } from "./model";

/**
 * Creates a single-valued pure stream
 */
export const pure = <A>(a: A): UIO<A> => fromArray([a]);

/**
 * Taskfully transforms the chunks emitted by this stream.
 */
export const mapChunksM_ = <R, E, A, R1, E1, B>(
   fa: Stream<R, E, A>,
   f: (chunks: ReadonlyArray<A>) => T.Task<R1, E1, ReadonlyArray<B>>
): Stream<R & R1, E | E1, B> =>
   new Stream(
      pipe(
         fa.proc,
         M.map((e) =>
            pipe(
               e,
               T.chain((x) => pipe(f(x), T.first<E1, Option<E | E1>>(O.some)))
            )
         )
      )
   );

/**
 * Taskfully transforms the chunks emitted by this stream.
 */
export const mapChunksM = <A, R1, E1, A1>(f: (chunks: ReadonlyArray<A>) => T.Task<R1, E1, ReadonlyArray<A1>>) => <R, E>(
   fa: Stream<R, E, A>
): Stream<R & R1, E1 | E, A1> => mapChunksM_(fa, f);

/**
 * Transforms the chunks emitted by this stream.
 */
export const mapChunks_ = <R, E, A, B>(fa: Stream<R, E, A>, f: (chunks: ReadonlyArray<A>) => ReadonlyArray<B>) =>
   mapChunksM_(fa, flow(f, T.pure));

/**
 * Transforms the chunks emitted by this stream.
 */
export const mapChunks = <A, B>(f: (chunks: ReadonlyArray<A>) => ReadonlyArray<B>) => <R, E>(fa: Stream<R, E, A>) =>
   mapChunks_(fa, f);

/**
 * Transforms the chunks emitted by this stream.
 */
export const map_ = <R, E, A, B>(fa: Stream<R, E, A>, f: (a: A) => B): Stream<R, E, B> => mapChunks_(fa, A.map(f));

/**
 * Transforms the chunks emitted by this stream.
 */
export const map = <A, B>(f: (a: A) => B) => <R, E>(fa: Stream<R, E, A>): Stream<R, E, B> => map_(fa, f);

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export const mapM_ = <R, E, A, R1, E1, B>(
   fa: Stream<R, E, A>,
   f: (a: A) => T.Task<R1, E1, B>
): Stream<R & R1, E | E1, B> =>
   new Stream<R & R1, E | E1, B>(
      pipe(
         fa.proc,
         M.mapTask(BPull.make),
         M.map((pull) =>
            pipe(
               pull,
               BPull.pullElement,
               T.chain((o) =>
                  pipe(
                     f(o),
                     T.bimap(O.some, (o1) => [o1] as [B])
                  )
               )
            )
         )
      )
   );

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export const mapM = <A, R1, E1, A1>(f: (o: A) => T.Task<R1, E1, A1>) => <R, E>(fa: Stream<R, E, A>) => mapM_(fa, f);

export const first_ = <R, E, A, D>(pab: Stream<R, E, A>, f: (e: E) => D) =>
   new Stream(pipe(pab.proc, M.map(T.first(O.map(f)))));

export const first = <E, D>(f: (e: E) => D) => <R, A>(pab: Stream<R, E, A>) => first_(pab, f);

export const mapError = first;

export const mapErrorCause_ = <R, E, A, E1>(stream: Stream<R, E, A>, f: (e: Cause<E>) => Cause<E1>) =>
   new Stream(
      pipe(
         stream.proc,
         M.map(
            T.mapErrorCause((cause) =>
               pipe(
                  C.sequenceCauseOption(cause),
                  O.fold(
                     () => C.fail(O.none()),
                     (c) => C.map_(f(c), O.some)
                  )
               )
            )
         )
      )
   );

export const mapErrorCause = <E, D>(f: (e: Cause<E>) => Cause<D>) => <R, A>(stream: Stream<R, E, A>) =>
   mapErrorCause_(stream, f);

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export const chain_ = <R, E, A, Q, D, B>(fa: Stream<R, E, A>, f: (a: A) => Stream<Q, D, B>) => {
   type R_ = R & Q;
   type E_ = E | D;

   return new Stream(
      pipe(
         M.of,
         M.bindS("outerStream", () => fa.proc),
         M.bindS("currOuterChunk", () =>
            T.toManaged()(
               XR.makeRef<[ReadonlyArray<A>, number]>([[], 0])
            )
         ),
         M.bindS("currInnerStream", () =>
            T.toManaged()(XR.makeRef<T.Task<R_, Option<E_>, ReadonlyArray<B>>>(Pull.end))
         ),
         M.bindS("innerFinalizer", () => M.finalizerRef(M.noopFinalizer) as M.Managed<R_, never, XR.Ref<M.Finalizer>>),
         M.map(({ currInnerStream, currOuterChunk, innerFinalizer, outerStream }) =>
            new Chain(f, outerStream, currOuterChunk, currInnerStream, innerFinalizer).apply()
         )
      )
   );
};

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export const chain = <A, Q, D, B>(f: (a: A) => Stream<Q, D, B>) => <R, E>(
   fa: Stream<R, E, A>
): Stream<Q & R, D | E, B> => chain_(fa, f);

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 */
export const flatten = <R, E, Q, D, A>(ffa: Stream<R, E, Stream<Q, D, A>>): Stream<Q & R, D | E, A> =>
   chain_(ffa, identity);

export const absolve: <R, E, A, E1>(stream: Stream<R, E, E.Either<E1, A>>) => Stream<R, E | E1, A> = chain(
   E.fold(fail, pure)
);

export const ask = <R>(): RIO<R, R> => fromTask(T.ask<R>());

export const asks = <R, A>(f: (_: R) => A): Stream<R, never, A> => map_(ask(), f);

export const asksTask = <R0, R, E, A>(f: (_: R0) => T.Task<R, E, A>): Stream<R & R0, E, A> => mapM_(ask<R0>(), f);

export const asksM = <R0, R, E, A>(f: (_: R0) => Stream<R, E, A>) => chain_(ask<R0>(), f);

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 */
export const mapAccumM_ = <R, E, A, R1, E1, B, Z>(
   stream: Stream<R, E, A>,
   z: Z,
   f: (z: Z, a: A) => T.Task<R1, E1, [Z, B]>
) =>
   new Stream<R & R1, E | E1, B>(
      pipe(
         M.of,
         M.bindS("state", () => XR.makeManagedRef(z)),
         M.bindS("pull", () => pipe(stream.proc, M.mapTask(BPull.make))),
         M.map(({ pull, state }) =>
            pipe(
               pull,
               BPull.pullElement,
               T.chain((o) =>
                  pipe(
                     T.of,
                     T.bindS("s", () => state.get),
                     T.bindS("t", ({ s }) => f(s, o)),
                     T.tap(({ t }) => state.set(t[0])),
                     T.map(({ t }) => [t[1]]),
                     T.first(O.some)
                  )
               )
            )
         )
      )
   );

export const mapAccumM = <Z>(z: Z) => <A, R1, E1, B>(f: (z: Z, a: A) => T.Task<R1, E1, [Z, B]>) => <R, E>(
   stream: Stream<R, E, A>
) => mapAccumM_(stream, z, f);

export const mapAccum_ = <R, E, A, B, Z>(stream: Stream<R, E, A>, z: Z, f: (z: Z, a: A) => [Z, B]) =>
   mapAccumM_(stream, z, (z, a) => T.pure(f(z, a)));

export const mapAccum = <Z>(z: Z) => <A, B>(f: (z: Z, a: A) => [Z, B]) => <R, E>(stream: Stream<R, E, A>) =>
   mapAccum_(stream, z, f);

export const mapConcat_ = <R, E, A, B>(stream: Stream<R, E, A>, f: (a: A) => Iterable<B>) =>
   mapChunks_(stream, (chunks) => A.chain_(chunks, (a) => Array.from(f(a))));

export const mapConcat = <A, B>(f: (a: A) => Iterable<B>) => <R, E>(stream: Stream<R, E, A>) => mapConcat_(stream, f);

export const mapConcatChunk_ = <R, E, A, B>(stream: Stream<R, E, A>, f: (a: A) => ReadonlyArray<B>) =>
   mapChunks_(stream, (chunks) => A.chain_(chunks, f));

export const mapConcatChunk = <A, B>(f: (a: A) => ReadonlyArray<B>) => <R, E>(stream: Stream<R, E, A>) =>
   mapConcatChunk_(stream, f);

export const mapConcatChunkM_ = <R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   f: (a: A) => T.Task<R1, E1, ReadonlyArray<B>>
) => pipe(stream, mapM(f), mapConcatChunk(identity));

export const mapConcatChunkM = <A, R1, E1, B>(f: (a: A) => T.Task<R1, E1, ReadonlyArray<B>>) => <R, E>(
   stream: Stream<R, E, A>
) => mapConcatChunkM_(stream, f);

export const mapConcatM_ = <R, E, A, R1, E1, B>(stream: Stream<R, E, A>, f: (a: A) => T.Task<R1, E1, Iterable<B>>) =>
   pipe(
      stream,
      mapConcatChunkM((a) => T.map_(f(a), (_) => Array.from(_)))
   );

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 */
export const mapTaskPar_ = (n: number) => <R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   f: (a: A) => T.Task<R1, E1, B>
): Stream<R & R1, E | E1, B> =>
   new Stream(
      pipe(
         M.of,
         M.bindS("out", () => T.toManaged()(XQ.makeBounded<T.Task<R1, Option<E1 | E>, B>>(n))),
         M.bindS("errorSignal", () => T.toManaged()(XP.make<E1, never>())),
         M.bindS("permits", () => T.toManaged()(Semaphore.makeSemaphore(n))),
         M.tap(({ errorSignal, out, permits }) =>
            pipe(
               stream,
               foreachManaged((a) =>
                  pipe(
                     T.of,
                     T.bindS("p", () => XP.make<E1, B>()),
                     T.bindS("latch", () => XP.make<never, void>()),
                     T.tap(({ p }) => out.offer(pipe(p, XP.await, T.first(O.some)))),
                     T.tap(({ latch, p }) =>
                        pipe(
                           latch,
                           // Make sure we start evaluation before moving on to the next element
                           XP.succeed<void>(undefined),
                           T.chain(() =>
                              pipe(
                                 errorSignal,
                                 XP.await,
                                 // Interrupt evaluation if another task fails
                                 T.raceFirst(f(a)),
                                 // Notify other tasks of a failure
                                 T.tapCause((e) => pipe(errorSignal, XP.halt(e))),
                                 // Transfer the result to the consuming stream
                                 T.to(p)
                              )
                           ),
                           Semaphore.withPermit(permits),
                           T.fork
                        )
                     ),
                     T.tap(({ latch }) => XP.await(latch)),
                     T.asUnit
                  )
               ),
               M.foldCauseM(
                  (c) => T.toManaged()(out.offer(Pull.halt(c))),
                  () =>
                     pipe(
                        Semaphore.withPermits(n)(permits)(T.unit),
                        T.chain(() => out.offer(Pull.end)),
                        T.toManaged()
                     )
               ),
               M.fork
            )
         ),
         M.map(({ out }) =>
            pipe(
               out.take,
               T.flatten,
               T.map((o) => [o])
            )
         )
      )
   );

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 */
export const mapTaskPar = (n: number) => <A, R1, E1, B>(f: (a: A) => T.Task<R1, E1, B>) => <R, E>(
   stream: Stream<R, E, A>
) => mapTaskPar_(n)(stream, f);

/**
 * Creates a stream from an asynchronous callback that can be called multiple times
 * The registration of the callback itself returns a task. The optionality of the
 * error type `E` can be used to signal the end of the stream, by setting it to `None`.
 */
export const asyncTask = <R, E, A, R1 = R, E1 = E>(
   register: (
      cb: (
         next: T.Task<R, Option<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.UIO<Exit<never, boolean>>
   ) => T.Task<R1, E1, unknown>,
   outputBuffer = 16
): Stream<R & R1, E | E1, A> =>
   pipe(
      M.of,
      M.bindS("output", () => pipe(XQ.makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())),
      M.bindS("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
      M.tap(({ output, runtime }) =>
         T.toManaged()(
            register((k, cb) => pipe(Take.fromPull(k), T.chain(output.offer), (x) => runtime.runCancel(x, cb)))
         )
      ),
      M.bindS("done", () => XR.makeManagedRef(false)),
      M.letS("pull", ({ done, output }) =>
         pipe(
            done.get,
            T.chain((b) =>
               b
                  ? Pull.end
                  : pipe(
                       output.take,
                       T.chain(Take.done),
                       T.onError(() =>
                          pipe(
                             done.set(true),
                             T.chain(() => output.shutdown)
                          )
                       )
                    )
            )
         )
      ),
      M.map(({ pull }) => pull),
      managed,
      chain(repeatTaskChunkOption)
   );
