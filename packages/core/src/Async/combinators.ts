import type { FreeMonoid } from "../FreeMonoid";
import * as FM from "../FreeMonoid";
import { flow, identity } from "../Function";
import * as Iter from "../Iterable";
import { zipWith_ } from "./apply-seq";
import type { AsyncExit } from "./AsyncExit";
import { failure, success } from "./AsyncExit";
import { succeed, suspend, unfailable } from "./constructors";
import { foldM_ } from "./fold";
import { map_ } from "./functor";
import type { Async } from "./model";
import { AllInstruction, FinalizeInstruction } from "./model";
import { chain_ } from "./monad";

export function sleep(ms: number): Async<unknown, never, void> {
  return unfailable<void>(
    (onInterrupt) =>
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          resolve(undefined);
        }, ms);
        onInterrupt(() => {
          clearInterval(timer);
        });
      })
  );
}

export function delay_<R, E, A>(async: Async<R, E, A>, ms: number): Async<R, E, A> {
  return chain_(sleep(ms), () => async);
}

export function delay(ms: number): <R, E, A>(async: Async<R, E, A>) => Async<R, E, A> {
  return (async) => delay_(async, ms);
}

export function result<R, E, A>(async: Async<R, E, A>): Async<R, never, AsyncExit<E, A>> {
  return foldM_(async, flow(failure, succeed), flow(success, succeed));
}

export function onInterrupt_<R, E, A, R1, A1>(
  async: Async<R, E, A>,
  onInterrupted: () => Async<R1, never, A1>
): Async<R & R1, E, A> {
  return new FinalizeInstruction(async, onInterrupted);
}

export function onInterrupt<R1, A1>(
  onInterrupted: () => Async<R1, never, A1>
): <R, E, A>(async: Async<R, E, A>) => Async<R & R1, E, A> {
  return (async) => onInterrupt_(async, onInterrupted);
}

export function collectAll<R, E, A>(
  fas: ReadonlyArray<Async<R, E, A>>
): Async<R, E, ReadonlyArray<A>> {
  return foreach_(fas, identity);
}

export function collectAllPar<R, E, A>(
  fas: ReadonlyArray<Async<R, E, A>>
): Async<R, E, ReadonlyArray<A>> {
  return new AllInstruction(fas);
}

export function foreach_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Async<R, E, B>
): Async<R, E, ReadonlyArray<B>> {
  return map_(
    Iter.reduce_(as, succeed(FM.empty<B>()) as Async<R, E, FreeMonoid<B>>, (b, a) =>
      zipWith_(
        b,
        suspend(() => f(a)),
        (acc, r) => FM.append_(acc, r)
      )
    ),
    FM.toArray
  );
}

export function foreach<A, R, E, B>(
  f: (a: A) => Async<R, E, B>
): (as: Iterable<A>) => Async<R, E, ReadonlyArray<B>> {
  return (as) => foreach_(as, f);
}

export function foreachPar_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Async<R, E, B>
): Async<R, E, ReadonlyArray<B>> {
  return collectAllPar(
    FM.toArray(Iter.reduce_(as, FM.empty<Async<R, E, B>>(), (b, a) => FM.append_(b, f(a))))
  );
}

export function foreachPar<A, R, E, B>(
  f: (a: A) => Async<R, E, B>
): (as: Iterable<A>) => Async<R, E, ReadonlyArray<B>> {
  return (as) => foreachPar_(as, f);
}
