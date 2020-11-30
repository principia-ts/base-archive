import { pipe } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import type * as I from "../model";
import { ModifyFiberRefInstruction } from "../model";
import type { FiberRef } from "./model";

export function modify_<A, B>(fiberRef: FiberRef<A>, f: (a: A) => [B, A]): I.UIO<B> {
  return new ModifyFiberRefInstruction(fiberRef, f);
}

export function modify<A, B>(f: (a: A) => [B, A]): (fiberRef: FiberRef<A>) => I.UIO<B> {
  return (fr) => modify_(fr, f);
}

export function update_<A>(fiberRef: FiberRef<A>, f: (a: A) => A): I.UIO<void> {
  return modify_(fiberRef, (a) => [undefined, f(a)]);
}

export function update<A>(f: (a: A) => A): (fiberRef: FiberRef<A>) => I.UIO<void> {
  return (fr) => update_(fr, f);
}

export function set_<A>(fiberRef: FiberRef<A>, a: A): I.UIO<void> {
  return modify_(fiberRef, () => [undefined, a]);
}

export function set<A>(a: A): (fiberRef: FiberRef<A>) => I.UIO<void> {
  return (fr) => set_(fr, a);
}

export function get<A>(fiberRef: FiberRef<A>): I.UIO<A> {
  return pipe(
    fiberRef,
    modify((a) => [a, a])
  );
}

export function getAndSet_<A>(fiberRef: FiberRef<A>, a: A): I.UIO<A> {
  return modify_(fiberRef, (v) => [v, a]);
}

export function getAndSet<A>(a: A): (fiberRef: FiberRef<A>) => I.UIO<A> {
  return (fr) => getAndSet_(fr, a);
}

export function getAndUpdate_<A>(fiberRef: FiberRef<A>, f: (a: A) => A): I.UIO<A> {
  return modify_(fiberRef, (a) => [a, f(a)]);
}

export function getAndUpdate<A>(f: (a: A) => A): (fiberRef: FiberRef<A>) => I.UIO<A> {
  return (fr) => getAndUpdate_(fr, f);
}

export function getAndUpdateSome_<A>(fiberRef: FiberRef<A>, f: (a: A) => Option<A>): I.UIO<A> {
  return modify_(fiberRef, (a) => [a, O.getOrElse_(f(a), () => a)]);
}

export function getAndUpdateSome<A>(f: (a: A) => Option<A>): (fiberRef: FiberRef<A>) => I.UIO<A> {
  return (fr) => getAndUpdateSome_(fr, f);
}
