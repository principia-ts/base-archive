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
export function make<A>(a: A): T.IO<RefM<A>> {
  return pipe(
    T.do,
    T.bindS("ref", () => XR.make(a)),
    T.bindS("semaphore", () => S.make(1)),
    T.map(({ ref, semaphore }) => new Atomic(ref, semaphore))
  );
}

/**
 * Creates a new `XRefM` with the specified value.
 */
export function unsafeMake<A>(a: A): RefM<A> {
  const ref = XR.unsafeMake(a);
  const semaphore = S.unsafeMake(1);
  return new Atomic(ref, semaphore);
}

/**
 * Creates a new `RefM` with the specified value in the context of a
 * `Managed.`
 */
export function makeManaged<A>(a: A): M.IO<RefM<A>> {
  return pipe(make(a), M.fromTask);
}

/**
 * Creates a new `RefM` and a `Dequeue` that will emit every change to the
 * `RefM`.
 */
export function dequeueRef<A>(a: A): T.IO<[RefM<A>, XQ.Dequeue<A>]> {
  return pipe(
    T.do,
    T.bindS("ref", () => make(a)),
    T.bindS("queue", () => XQ.makeUnbounded<A>()),
    T.map(({ queue, ref }) => [
      pipe(
        ref,
        tapInput((a) => queue.offer(a))
      ),
      queue
    ])
  );
}
