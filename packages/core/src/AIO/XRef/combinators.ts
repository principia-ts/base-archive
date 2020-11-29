import * as E from "../../Either";
import { identity, pipe, tuple } from "../../Function";
import type { Option } from "../../Option";
import { none, some } from "../../Option";
import * as Mb from "../../Option";
import { matchTag } from "../../Utils";
import * as T from "../AIO/_core";
import type { EIO } from "../AIO/model";
import * as At from "./atomic";
import type { Ref, XRef } from "./model";
import { concrete } from "./model";

/**
 * Maps and filters the `get` value of the `XRef` with the specified partial
 * function, returning a `XRef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect<B, C>(
  pf: (_: B) => Option<C>
): <EA, EB, A>(_: XRef<EA, EB, A, B>) => XRef<EA, Option<EB>, A, C> {
  return (_) => _.fold(identity, some, E.right, (b) => E.fromOption_(pf(b), () => none()));
}

/**
 * Maps and filters the `get` value of the `XRef` with the specified partial
 * function, returning a `XRef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect_<EA, EB, A, B, C>(
  _: XRef<EA, EB, A, B>,
  pf: (_: B) => Option<C>
): XRef<EA, Option<EB>, A, C> {
  return collect(pf)(_);
}

/**
 * Returns a read only view of the `XRef`.
 */
export function readOnly<EA, EB, A, B>(_: XRef<EA, EB, A, B>): XRef<EA, EB, never, B> {
  return _;
}

/**
 * Returns a write only view of the `XRef`.
 */
export function writeOnly<EA, EB, A, B>(_: XRef<EA, EB, A, B>): XRef<EA, void, A, never> {
  return _.fold(
    identity,
    () => undefined,
    E.right,
    () => E.left(undefined)
  );
}

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify<B, A>(f: (a: A) => readonly [B, A]) {
  return <EA, EB>(self: XRef<EA, EB, A, A>): EIO<EA | EB, B> =>
    pipe(
      self,
      concrete,
      matchTag({
        Atomic: At.modify(f),
        Derived: (self) =>
          pipe(
            self.value,
            At.modify((s) =>
              pipe(
                s,
                self.getEither,
                E.fold(
                  (e) => tuple(E.left(e), s),
                  (a1) =>
                    pipe(f(a1), ([b, a2]) =>
                      pipe(
                        a2,
                        self.setEither,
                        E.fold(
                          (e) => tuple(E.left(e), s),
                          (s) => tuple(E.widenE<EA | EB>()(E.right(b)), s)
                        )
                      )
                    )
                )
              )
            ),
            T.absolve
          ),
        DerivedAll: (self) =>
          pipe(
            self.value,
            At.modify((s) =>
              pipe(
                s,
                self.getEither,
                E.fold(
                  (e) => tuple(E.left(e), s),
                  (a1) =>
                    pipe(f(a1), ([b, a2]) =>
                      pipe(
                        self.setEither(a2)(s),
                        E.fold(
                          (e) => tuple(E.left(e), s),
                          (s) => tuple(E.widenE<EA | EB>()(E.right(b)), s)
                        )
                      )
                    )
                )
              )
            ),
            T.absolve
          )
      })
    );
}

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify_<EA, EB, B, A>(
  self: XRef<EA, EB, A, A>,
  f: (a: A) => [B, A]
): EIO<EA | EB, B> {
  return modify(f)(self);
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export function modifySome<B>(
  def: B
): <A>(f: (a: A) => Option<[B, A]>) => <EA, EB>(self: XRef<EA, EB, A, A>) => T.EIO<EA | EB, B> {
  return (f) => (self) =>
    pipe(
      self,
      concrete,
      matchTag(
        { Atomic: At.modifySome(def)(f) },
        modify((a) =>
          pipe(
            f(a),
            Mb.getOrElse(() => tuple(def, a))
          )
        )
      )
    );
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export function modifySome_<EA, EB, A, B>(
  self: XRef<EA, EB, A, A>,
  def: B,
  f: (a: A) => Option<[B, A]>
): EIO<EA | EB, B> {
  return modifySome(def)(f)(self);
}

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 */
export function getAndSet<A>(
  a: A
): <EA, EB>(self: XRef<EA, EB, A, A>) => T.IO<A> | T.EIO<EA | EB, A> {
  return (self) =>
    pipe(
      self,
      concrete,
      matchTag(
        { Atomic: At.getAndSet(a) },
        modify((v) => tuple(v, a))
      )
    );
}

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 */
export function getAndSet_<EA, EB, A>(self: XRef<EA, EB, A, A>, a: A) {
  return getAndSet(a)(self);
}

/**
 * Atomically modifies the `XRef` with the specified function, returning
 * the value immediately before modification.
 */
export function getAndUpdate<A>(f: (a: A) => A) {
  return <EA, EB>(self: XRef<EA, EB, A, A>) =>
    pipe(
      self,
      concrete,
      matchTag(
        { Atomic: At.getAndUpdate(f) },
        modify((v) => tuple(v, f(v)))
      )
    );
}

/**
 * Atomically modifies the `XRef` with the specified function, returning
 * the value immediately before modification.
 */
export function getAndUpdate_<EA, EB, A>(self: XRef<EA, EB, A, A>, f: (a: A) => A) {
  return getAndUpdate(f)(self);
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export function getAndUpdateSome<A>(f: (a: A) => Option<A>) {
  return <EA, EB>(self: XRef<EA, EB, A, A>) =>
    pipe(
      self,
      concrete,
      matchTag(
        { Atomic: At.getAndUpdateSome(f) },
        modify((v) =>
          pipe(
            f(v),
            Mb.getOrElse(() => v),
            (a) => tuple(v, a)
          )
        )
      )
    );
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export function getAndUpdateSome_<EA, EB, A>(self: XRef<EA, EB, A, A>, f: (a: A) => Option<A>) {
  return getAndUpdateSome(f)(self);
}

/**
 * Atomically modifies the `XRef` with the specified function.
 */
export function update<A>(f: (a: A) => A) {
  return <EA, EB>(self: XRef<EA, EB, A, A>): EIO<EA | EB, void> =>
    pipe(
      self,
      concrete,
      matchTag(
        { Atomic: At.update(f) },
        modify((v) => tuple(undefined, f(v)))
      )
    );
}

/**
 * Atomically modifies the `XRef` with the specified function.
 */
export function update_<EA, EB, A>(self: XRef<EA, EB, A, A>, f: (a: A) => A): EIO<EA | EB, void> {
  return update(f)(self);
}

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 */
export function updateAndGet<A>(f: (a: A) => A) {
  return <EA, EB>(self: XRef<EA, EB, A, A>): EIO<EA | EB, A> =>
    pipe(
      self,
      concrete,
      matchTag({ Atomic: At.updateAndGet(f) }, (self) =>
        pipe(
          self,
          modify((v) => pipe(f(v), (result) => tuple(result, result))),
          T.chain(() => self.get)
        )
      )
    );
}

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 */
export function updateAndGet_<EA, EB, A>(
  self: XRef<EA, EB, A, A>,
  f: (a: A) => A
): EIO<EA | EB, A> {
  return updateAndGet(f)(self);
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export function updateSome<A>(f: (a: A) => Option<A>) {
  return <EA, EB>(self: XRef<EA, EB, A, A>): EIO<EA | EB, void> =>
    pipe(
      self,
      concrete,
      matchTag(
        { Atomic: At.updateSome(f) },
        modify((v) =>
          pipe(
            f(v),
            Mb.getOrElse(() => v),
            (a) => tuple(undefined, a)
          )
        )
      )
    );
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export function updateSome_<EA, EB, A>(
  self: XRef<EA, EB, A, A>,
  f: (a: A) => Option<A>
): EIO<EA | EB, void> {
  return updateSome(f)(self);
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export function updateSomeAndGet<A>(f: (a: A) => Option<A>) {
  return <EA, EB>(self: XRef<EA, EB, A, A>): EIO<EA | EB, A> =>
    pipe(
      self,
      concrete,
      matchTag(
        { Atomic: At.updateSomeAndGet(f) },
        modify((v) =>
          pipe(
            f(v),
            Mb.getOrElse(() => v),
            (result) => tuple(result, result)
          )
        )
      )
    );
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export function updateSomeAndGet_<EA, EB, A>(
  self: XRef<EA, EB, A, A>,
  f: (a: A) => Option<A>
): EIO<EA | EB, A> {
  return updateSomeAndGet(f)(self);
}

/**
 * Unsafe update value in a Ref<A>
 */
export function unsafeUpdate<A>(f: (a: A) => A) {
  return (self: Ref<A>) =>
    pipe(
      self,
      concrete,
      matchTag({
        Atomic: At.unsafeUpdate(f),
        Derived: (self) =>
          pipe(
            self.value,
            At.unsafeUpdate((s) => pipe(s, self.getEither, E.merge, f, self.setEither, E.merge))
          ),
        DerivedAll: (self) =>
          pipe(
            self.value,
            At.unsafeUpdate((s) =>
              pipe(s, self.getEither, E.merge, f, (a) => self.setEither(a)(s), E.merge)
            )
          )
      })
    );
}

/**
 * Unsafe update value in a Ref<A>
 */
export function unsafeUpdate_<A>(self: Ref<A>, f: (a: A) => A) {
  return unsafeUpdate(f)(self);
}

/**
 * Reads the value from the `XRef`.
 */
export function get<EA, EB, A, B>(self: XRef<EA, EB, A, B>) {
  return self.get;
}

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export function set<A>(a: A): <EA, EB, B>(self: XRef<EA, EB, A, B>) => T.EIO<EA, void> {
  return (self) => self.set(a);
}

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export function set_<EA, EB, B, A>(self: XRef<EA, EB, A, B>, a: A) {
  return self.set(a);
}
