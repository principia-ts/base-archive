import { identity, pipe } from "@principia/core/Function";
import type { Maybe } from "@principia/core/Maybe";
import * as Mb from "@principia/core/Maybe";

import type * as T from "../Effect";
import { ModifyFiberRefInstruction, NewFiberRefInstruction } from "../Effect/Effect";

export interface FiberRef<A> {
   readonly _tag: "FiberRef";
   readonly initial: A;
   readonly fork: (a: A) => A;
   readonly join: (a: A, a1: A) => A;
}

export const fiberRef = <A>(
   initial: A,
   fork: (a: A) => A,
   join: (a: A, a1: A) => A
): FiberRef<A> => ({
   _tag: "FiberRef",
   initial,
   fork,
   join
});

export const make = <A>(
   initial: A,
   onFork: (a: A) => A = identity,
   onJoin: (a: A, a1: A) => A = (_, a) => a
): T.UIO<FiberRef<A>> => new NewFiberRefInstruction(initial, onFork, onJoin);

export const modify = <A, B>(f: (a: A) => [B, A]) => (fiberRef: FiberRef<A>): T.UIO<B> =>
   new ModifyFiberRefInstruction(fiberRef, f);

export const update = <A>(f: (a: A) => A) => (fiberRef: FiberRef<A>): T.UIO<void> =>
   pipe(
      fiberRef,
      modify((v) => [undefined, f(v)])
   );

export const set = <A>(a: A) => (fiberRef: FiberRef<A>): T.UIO<void> =>
   pipe(
      fiberRef,
      modify((_) => [undefined, a])
   );

export const get = <A>(fiberRef: FiberRef<A>) =>
   pipe(
      fiberRef,
      modify((a) => [a, a])
   );

export const getAndSet = <A>(a: A) => (fiberRef: FiberRef<A>) =>
   pipe(
      fiberRef,
      modify((v) => [v, a])
   );

export const getAndUpdate = <A>(f: (a: A) => A) => (fiberRef: FiberRef<A>) =>
   pipe(
      fiberRef,
      modify((v) => [v, f(v)])
   );

export const getAndUpdateSome = <A>(f: (a: A) => Maybe<A>) => (fiberRef: FiberRef<A>) =>
   pipe(
      fiberRef,
      modify((v) => [v, Mb._getOrElse(f(v), () => v)])
   );
