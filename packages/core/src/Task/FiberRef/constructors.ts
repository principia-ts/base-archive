import { identity, pipe } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import type * as T from "../Task/model";
import { ModifyFiberRefInstruction, NewFiberRefInstruction } from "../Task/model";
import type { FiberRef } from "./model";

export function make<A>(
  initial: A,
  onFork: (a: A) => A = identity,
  onJoin: (a: A, a1: A) => A = (_, a) => a
): T.IO<FiberRef<A>> {
  return new NewFiberRefInstruction(initial, onFork, onJoin);
}

export function modify<A, B>(f: (a: A) => [B, A]): (fiberRef: FiberRef<A>) => T.IO<B> {
  return (fiberRef) => new ModifyFiberRefInstruction(fiberRef, f);
}

export function update<A>(f: (a: A) => A): (fiberRef: FiberRef<A>) => T.IO<void> {
  return (fiberRef) =>
    pipe(
      fiberRef,
      modify((v) => [undefined, f(v)])
    );
}

export function set<A>(a: A): (fiberRef: FiberRef<A>) => T.IO<void> {
  return modify((_) => [undefined, a]);
}

export function get<A>(fiberRef: FiberRef<A>): T.IO<A> {
  return pipe(
    fiberRef,
    modify((a) => [a, a])
  );
}

export function getAndSet<A>(a: A): (fiberRef: FiberRef<A>) => T.IO<A> {
  return modify((v) => [v, a]);
}

export function getAndUpdate<A>(f: (a: A) => A): (fiberRef: FiberRef<A>) => T.IO<A> {
  return modify((v) => [v, f(v)]);
}

export function getAndUpdateSome<A>(f: (a: A) => Option<A>): (fiberRef: FiberRef<A>) => T.IO<A> {
  return modify((v) => [v, O.getOrElse_(f(v), () => v)]);
}
