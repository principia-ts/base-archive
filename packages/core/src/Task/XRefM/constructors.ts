import { pipe } from "../../Function";
import * as M from "../Managed/_core";
import * as S from "../Semaphore";
import * as T from "../Task/_core";
import * as XQ from "../XQueue";
import * as XR from "../XRef";
import type { RefM } from "./model";
import { Atomic } from "./model";
import { tapInput } from "./tap";

/**
 * Creates a new `XRefM` with the specified value.
 */
export const makeRefM = <A>(a: A): T.IO<RefM<A>> =>
   pipe(
      T.do,
      T.bindS("ref", () => XR.makeRef(a)),
      T.bindS("semaphore", () => S.makeSemaphore(1)),
      T.map(({ ref, semaphore }) => new Atomic(ref, semaphore))
   );

/**
 * Creates a new `XRefM` with the specified value.
 */
export const unsafeMakeRefM = <A>(a: A): RefM<A> => {
   const ref = XR.unsafeMakeRef(a);
   const semaphore = S.unsafeMakeSemaphore(1);
   return new Atomic(ref, semaphore);
};

/**
 * Creates a new `RefM` with the specified value in the context of a
 * `Managed.`
 */
export const makeManagedRefM = <A>(a: A): M.IO<RefM<A>> => pipe(makeRefM(a), M.fromTask);

/**
 * Creates a new `RefM` and a `Dequeue` that will emit every change to the
 * `RefM`.
 */
export const dequeueRef = <A>(a: A): T.IO<[RefM<A>, XQ.Dequeue<A>]> =>
   pipe(
      T.do,
      T.bindS("ref", () => makeRefM(a)),
      T.bindS("queue", () => XQ.makeUnbounded<A>()),
      T.map(({ queue, ref }) => [
         pipe(
            ref,
            tapInput((a) => queue.offer(a))
         ),
         queue
      ])
   );
