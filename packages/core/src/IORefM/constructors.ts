import { pipe } from "../Function";
import type { UIO } from "../IO/_core";
import * as I from "../IO/_core";
import * as S from "../IO/Semaphore";
import * as Ref from "../IORef";
import type { UManaged } from "../Managed/_core";
import * as M from "../Managed/_core";
import * as Q from "../Queue";
import type { URefM } from "./model";
import { Atomic } from "./model";
import { tapInput } from "./tap";

/**
 * Creates a new `XRefM` with the specified value.
 */
export function make<A>(a: A): UIO<URefM<A>> {
  return pipe(
    I.do,
    I.bindS("ref", () => Ref.make(a)),
    I.bindS("semaphore", () => S.make(1)),
    I.map(({ ref, semaphore }) => new Atomic(ref, semaphore))
  );
}

/**
 * Creates a new `XRefM` with the specified value.
 */
export function unsafeMake<A>(a: A): URefM<A> {
  const ref = Ref.unsafeMake(a);
  const semaphore = S.unsafeMake(1);
  return new Atomic(ref, semaphore);
}

/**
 * Creates a new `RefM` with the specified value in the context of a
 * `Managed.`
 */
export function makeManaged<A>(a: A): UManaged<URefM<A>> {
  return pipe(make(a), M.fromEffect);
}

/**
 * Creates a new `RefM` and a `Dequeue` that will emit every change to the
 * `RefM`.
 */
export function dequeueRef<A>(a: A): UIO<[URefM<A>, Q.Dequeue<A>]> {
  return pipe(
    I.do,
    I.bindS("ref", () => make(a)),
    I.bindS("queue", () => Q.makeUnbounded<A>()),
    I.map(({ queue, ref }) => [
      pipe(
        ref,
        tapInput((a) => queue.offer(a))
      ),
      queue
    ])
  );
}
