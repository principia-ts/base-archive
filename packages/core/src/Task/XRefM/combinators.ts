import { left, right } from "../../Either";
import { identity, pipe, tuple } from "../../Function";
import type { Option } from "../../Option";
import { none, some } from "../../Option";
import * as Mb from "../../Option";
import { matchTag } from "../../Utils";
import * as S from "../Semaphore";
import * as T from "../Task/_core";
import { fold } from "./fold";
import type { XRefM } from "./model";
import { concrete } from "./model";

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export const modify_ = <RA, RB, EA, EB, R1, E1, B, A>(
   self: XRefM<RA, RB, EA, EB, A, A>,
   f: (a: A) => T.Task<R1, E1, readonly [B, A]>
): T.Task<RA & RB & R1, EA | EB | E1, B> =>
   pipe(
      self,
      concrete,
      matchTag({
         Atomic: (atomic) =>
            pipe(
               atomic.ref.get,
               T.chain(f),
               T.chain(([b, a]) => pipe(atomic.ref.set(a), T.as(b))),
               S.withPermit(atomic.semaphore)
            ),
         Derived: (derived) =>
            pipe(
               derived.value.ref.get,
               T.chain((a) =>
                  pipe(
                     derived.getEither(a),
                     T.chain(f),
                     T.chain(([b, a]) =>
                        pipe(
                           derived.setEither(a),
                           T.chain((a) => derived.value.ref.set(a)),
                           T.as(b)
                        )
                     )
                  )
               ),
               S.withPermit(derived.value.semaphore)
            ),
         DerivedAll: (derivedAll) =>
            pipe(
               derivedAll.value.ref.get,
               T.chain((s) =>
                  pipe(
                     derivedAll.getEither(s),
                     T.chain(f),
                     T.chain(([b, a]) =>
                        pipe(
                           derivedAll.setEither(a)(s),
                           T.chain((a) => derivedAll.value.ref.set(a)),
                           T.as(b)
                        )
                     )
                  )
               ),
               S.withPermit(derivedAll.value.semaphore)
            )
      })
   );

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export const modify = <R1, E1, B, A>(f: (a: A) => T.Task<R1, E1, readonly [B, A]>) => <RA, RB, EA, EB>(
   self: XRefM<RA, RB, EA, EB, A, A>
): T.Task<RA & RB & R1, EA | EB | E1, B> => modify_(self, f);

/**
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export const getAndSet_ = <RA, RB, EA, EB, A>(self: XRefM<RA, RB, EA, EB, A, A>, a: A) =>
   pipe(
      self,
      modify((v) => T.pure([v, a]))
   );

/**
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export const getAndSet = <A>(a: A) => <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, A>) => getAndSet_(self, a);

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export const getAndUpdate_ = <RA, RB, EA, EB, R1, E1, A>(
   self: XRefM<RA, RB, EA, EB, A, A>,
   f: (a: A) => T.Task<R1, E1, A>
) =>
   pipe(
      self,
      modify((v) =>
         pipe(
            f(v),
            T.map((r) => [v, r])
         )
      )
   );

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export const getAndUpdate = <R1, E1, A>(f: (a: A) => T.Task<R1, E1, A>) => <RA, RB, EA, EB>(
   self: XRefM<RA, RB, EA, EB, A, A>
) => getAndUpdate_(self, f);

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export const getAndUpdateSome_ = <RA, RB, EA, EB, R1, E1, A>(
   self: XRefM<RA, RB, EA, EB, A, A>,
   f: (a: A) => Option<T.Task<R1, E1, A>>
) =>
   pipe(
      self,
      modify((v) =>
         pipe(
            f(v),
            Mb.getOrElse(() => T.pure(v)),
            T.map((r) => [v, r])
         )
      )
   );

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export const getAndUpdateSome = <R1, E1, A>(f: (a: A) => Option<T.Task<R1, E1, A>>) => <RA, RB, EA, EB>(
   self: XRefM<RA, RB, EA, EB, A, A>
) => getAndUpdateSome_(self, f);

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateSome`.
 */
export const modifySome_ = <RA, RB, EA, EB, R1, E1, A, B>(
   self: XRefM<RA, RB, EA, EB, A, A>,
   def: B,
   f: (a: A) => Option<T.Task<R1, E1, readonly [B, A]>>
) =>
   pipe(
      self,
      modify((v) =>
         pipe(
            f(v),
            Mb.getOrElse(() => T.pure(tuple(def, v)))
         )
      )
   );

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateSome`.
 */
export const modifySome = <B>(def: B) => <R1, E1, A>(f: (a: A) => Option<T.Task<R1, E1, [B, A]>>) => <RA, RB, EA, EB>(
   self: XRefM<RA, RB, EA, EB, A, A>
) => modifySome_(self, def, f);

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const update_ = <RA, RB, EA, EB, R1, E1, A>(
   self: XRefM<RA, RB, EA, EB, A, A>,
   f: (a: A) => T.Task<R1, E1, A>
): T.Task<RA & RB & R1, E1 | EA | EB, void> =>
   pipe(
      self,
      modify((v) =>
         pipe(
            f(v),
            T.map((r) => [undefined, r])
         )
      )
   );

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const update = <R1, E1, A>(f: (a: A) => T.Task<R1, E1, A>) => <RA, RB, EA, EB>(
   self: XRefM<RA, RB, EA, EB, A, A>
): T.Task<RA & RB & R1, E1 | EA | EB, void> => update_(self, f);

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateAndGet_ = <RA, RB, EA, EB, R1, E1, A>(
   self: XRefM<RA, RB, EA, EB, A, A>,
   f: (a: A) => T.Task<R1, E1, A>
): T.Task<RA & RB & R1, E1 | EA | EB, void> =>
   pipe(
      self,
      modify((v) =>
         pipe(
            f(v),
            T.map((r) => [r, r])
         )
      )
   );

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateAndGet = <R1, E1, A>(f: (a: A) => T.Task<R1, E1, A>) => <RA, RB, EA, EB>(
   self: XRefM<RA, RB, EA, EB, A, A>
): T.Task<RA & RB & R1, E1 | EA | EB, void> => updateAndGet_(self, f);

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateSome_ = <RA, RB, EA, EB, R1, E1, A>(
   self: XRefM<RA, RB, EA, EB, A, A>,
   f: (a: A) => Option<T.Task<R1, E1, A>>
): T.Task<RA & RB & R1, E1 | EA | EB, void> =>
   pipe(
      self,
      modify((v) =>
         pipe(
            f(v),
            Mb.getOrElse(() => T.pure(v)),
            T.map((r) => [undefined, r])
         )
      )
   );

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateSome = <R1, E1, A>(f: (a: A) => Option<T.Task<R1, E1, A>>) => <RA, RB, EA, EB>(
   self: XRefM<RA, RB, EA, EB, A, A>
): T.Task<RA & RB & R1, E1 | EA | EB, void> => updateSome_(self, f);

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateSomeAndGet_ = <RA, RB, EA, EB, R1, E1, A>(
   self: XRefM<RA, RB, EA, EB, A, A>,
   f: (a: A) => Option<T.Task<R1, E1, A>>
): T.Task<RA & RB & R1, E1 | EA | EB, A> =>
   pipe(
      self,
      modify((v) =>
         pipe(
            f(v),
            Mb.getOrElse(() => T.pure(v)),
            T.map((r) => [r, r])
         )
      )
   );

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateSomeAndGet = <R1, E1, A>(f: (a: A) => Option<T.Task<R1, E1, A>>) => <RA, RB, EA, EB>(
   self: XRefM<RA, RB, EA, EB, A, A>
): T.Task<RA & RB & R1, E1 | EA | EB, A> => updateSomeAndGet_(self, f);

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * effectual partial function, returning a `XRefM` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export const collectM_ = <RA, RB, EA, EB, A, B, RC, EC, C>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (b: B) => Option<T.Task<RC, EC, C>>
): XRefM<RA, RB & RC, EA, Option<EB | EC>, A, C> =>
   self.foldM(
      identity,
      (_) => some<EB | EC>(_),
      (_) => T.pure(_),
      (b) =>
         pipe(
            f(b),
            Mb.map((a) => T.asSomeError(a)),
            Mb.getOrElse(() => T.fail(none()))
         )
   );

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * effectual partial function, returning a `XRefM` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export const collectM = <B, RC, EC, C>(f: (b: B) => Option<T.Task<RC, EC, C>>) => <RA, RB, EA, EB, A>(
   self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB & RC, EA, Option<EB | EC>, A, C> => collectM_(self, f);

/**
 * Maps and filters the `get` value of the `XRefM` with the specified partial
 * function, returning a `XRefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export const collect_ = <RA, RB, EA, EB, A, B, C>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (b: B) => Option<C>
): XRefM<RA, RB, EA, Option<EB>, A, C> =>
   pipe(
      self,
      collectM((b) => pipe(f(b), Mb.map(T.pure)))
   );

/**
 * Maps and filters the `get` value of the `XRefM` with the specified partial
 * function, returning a `XRefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export const collect = <B, C>(f: (b: B) => Option<C>) => <RA, RB, EA, EB, A>(
   self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, EA, Option<EB>, A, C> => collect_(self, f);

/**
 * Returns a read only view of the `XRefM`.
 */
export const readOnly = <RA, RB, EA, EB, A, B>(self: XRefM<RA, RB, EA, EB, A, B>): XRefM<RA, RB, EA, EB, never, B> =>
   self;

/**
 * Returns a read only view of the `XRefM`.
 */
export const writeOnly = <RA, RB, EA, EB, A, B>(self: XRefM<RA, RB, EA, EB, A, B>): XRefM<RA, RB, EA, void, A, never> =>
   pipe(
      self,
      fold(
         identity,
         (): void => undefined,
         right,
         () => left<void>(undefined)
      )
   );
