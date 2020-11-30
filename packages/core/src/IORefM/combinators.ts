import { left, right } from "../Either";
import { identity, pipe, tuple } from "../Function";
import * as I from "../IO/_core";
import * as S from "../IO/Semaphore";
import type { Option } from "../Option";
import { none, some } from "../Option";
import * as Mb from "../Option";
import { matchTag } from "../Utils";
import { fold } from "./fold";
import type { IORefM } from "./model";
import { concrete } from "./model";

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export function modify_<RA, RB, EA, EB, R1, E1, B, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, readonly [B, A]>
): I.IO<RA & RB & R1, EA | EB | E1, B> {
  return pipe(
    self,
    concrete,
    matchTag({
      Atomic: (atomic) =>
        pipe(
          atomic.ref.get,
          I.chain(f),
          I.chain(([b, a]) =>
            pipe(
              atomic.ref.set(a),
              I.as(() => b)
            )
          ),
          S.withPermit(atomic.semaphore)
        ),
      Derived: (derived) =>
        pipe(
          derived.value.ref.get,
          I.chain((a) =>
            pipe(
              derived.getEither(a),
              I.chain(f),
              I.chain(([b, a]) =>
                pipe(
                  derived.setEither(a),
                  I.chain((a) => derived.value.ref.set(a)),
                  I.as(() => b)
                )
              )
            )
          ),
          S.withPermit(derived.value.semaphore)
        ),
      DerivedAll: (derivedAll) =>
        pipe(
          derivedAll.value.ref.get,
          I.chain((s) =>
            pipe(
              derivedAll.getEither(s),
              I.chain(f),
              I.chain(([b, a]) =>
                pipe(
                  derivedAll.setEither(a)(s),
                  I.chain((a) => derivedAll.value.ref.set(a)),
                  I.as(() => b)
                )
              )
            )
          ),
          S.withPermit(derivedAll.value.semaphore)
        )
    })
  );
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export function modify<R1, E1, B, A>(
  f: (a: A) => I.IO<R1, E1, readonly [B, A]>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, B> {
  return (self) => modify_(self, f);
}

/**
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export function getAndSet_<RA, RB, EA, EB, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  a: A
): I.IO<RA & RB, EA | EB, A> {
  return pipe(
    self,
    modify((v) => I.pure([v, a]))
  );
}

/**
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export function getAndSet<A>(
  a: A
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB, EA | EB, A> {
  return (self) => getAndSet_(self, a);
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdate_<RA, RB, EA, EB, R1, E1, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, EA | EB | E1, A> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        I.map((r) => [v, r])
      )
    )
  );
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdate<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return (self) => getAndUpdate_(self, f);
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateSome_<RA, RB, EA, EB, R1, E1, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => Option<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, EA | EB | E1, A> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        Mb.getOrElse(() => I.pure(v)),
        I.map((r) => [v, r])
      )
    )
  );
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateSome<R1, E1, A>(
  f: (a: A) => Option<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, A> {
  return (self) => getAndUpdateSome_(self, f);
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateSome`.
 */
export function modifySome_<RA, RB, EA, EB, R1, E1, A, B>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  def: B,
  f: (a: A) => Option<I.IO<R1, E1, readonly [B, A]>>
): I.IO<RA & RB & R1, EA | EB | E1, B> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        Mb.getOrElse(() => I.pure(tuple(def, v)))
      )
    )
  );
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateSome`.
 */
export function modifySome<B>(
  def: B
): <R1, E1, A>(
  f: (a: A) => Option<I.IO<R1, E1, [B, A]>>
) => <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, B> {
  return (f) => (self) => modifySome_(self, def, f);
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function update_<RA, RB, EA, EB, R1, E1, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        I.map((r) => [undefined, r])
      )
    )
  );
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function update<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return (self) => update_(self, f);
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateAndGet_<RA, RB, EA, EB, R1, E1, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        I.map((r) => [r, r])
      )
    )
  );
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateAndGet<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return (self) => updateAndGet_(self, f);
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSome_<RA, RB, EA, EB, R1, E1, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => Option<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        Mb.getOrElse(() => I.pure(v)),
        I.map((r) => [undefined, r])
      )
    )
  );
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSome<R1, E1, A>(
  f: (a: A) => Option<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, void> {
  return (self) => updateSome_(self, f);
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSomeAndGet_<RA, RB, EA, EB, R1, E1, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => Option<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        Mb.getOrElse(() => I.pure(v)),
        I.map((r) => [r, r])
      )
    )
  );
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSomeAndGet<R1, E1, A>(
  f: (a: A) => Option<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return (self) => updateSomeAndGet_(self, f);
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * effectual partial function, returning a `XRefM` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export function collectM_<RA, RB, EA, EB, A, B, RC, EC, C>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => Option<I.IO<RC, EC, C>>
): IORefM<RA, RB & RC, EA, Option<EB | EC>, A, C> {
  return self.foldM(
    identity,
    (_) => some<EB | EC>(_),
    (_) => I.pure(_),
    (b) =>
      pipe(
        f(b),
        Mb.map((a) => I.asSomeError(a)),
        Mb.getOrElse(() => I.fail(none()))
      )
  );
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * effectual partial function, returning a `XRefM` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export function collectM<B, RC, EC, C>(
  f: (b: B) => Option<I.IO<RC, EC, C>>
): <RA, RB, EA, EB, A>(
  self: IORefM<RA, RB, EA, EB, A, B>
) => IORefM<RA, RB & RC, EA, Option<EC | EB>, A, C> {
  return (self) => collectM_(self, f);
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified partial
 * function, returning a `XRefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect_<RA, RB, EA, EB, A, B, C>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => Option<C>
): IORefM<RA, RB, EA, Option<EB>, A, C> {
  return pipe(
    self,
    collectM((b) => pipe(f(b), Mb.map(I.pure)))
  );
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified partial
 * function, returning a `XRefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect<B, C>(
  f: (b: B) => Option<C>
): <RA, RB, EA, EB, A>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EA, Option<EB>, A, C> {
  return (self) => collect_(self, f);
}

/**
 * Returns a read only view of the `XRefM`.
 */
export function readOnly<RA, RB, EA, EB, A, B>(
  self: IORefM<RA, RB, EA, EB, A, B>
): IORefM<RA, RB, EA, EB, never, B> {
  return self;
}

/**
 * Returns a read only view of the `XRefM`.
 */
export function writeOnly<RA, RB, EA, EB, A, B>(
  self: IORefM<RA, RB, EA, EB, A, B>
): IORefM<RA, RB, EA, void, A, never> {
  return pipe(
    self,
    fold(
      identity,
      (): void => undefined,
      right,
      () => left<void>(undefined)
    )
  );
}
