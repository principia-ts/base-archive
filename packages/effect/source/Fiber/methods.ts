import * as Mb from "@principia/core/Maybe";
import * as TC from "@principia/core/typeclass-index";

import * as C from "../Cause";
import { _mapBothPar } from "../Effect/functions/mapBothPar";
import * as Ex from "../Exit";
import * as T from "./_internal/effect";
import * as F from "./core";
import { Fiber, Synthetic } from "./Fiber";

/**
 * Effectually maps over the value the fiber computes.
 */
export const _mapEffect = <E, E1, A, B>(
   fiber: Fiber<E, A>,
   f: (a: A) => T.IO<E1, B>
): Synthetic<E | E1, B> => ({
   _tag: "SyntheticFiber",
   await: T._chain(fiber.await, Ex.foreach(f)),
   getRef: (ref) => fiber.getRef(ref),
   inheritRefs: fiber.inheritRefs,
   interruptAs: (id) => T._chain(fiber.interruptAs(id), Ex.foreach(f)),
   poll: T._chain(
      fiber.poll,
      Mb.fold(
         () => T.pure(Mb.nothing()),
         (a) => T._map(Ex._foreach(a, f), Mb.just)
      )
   )
});

/**
 * Effectually maps over the value the fiber computes.
 */
export const mapEffect = <A, E1, B>(f: (a: A) => T.IO<E1, B>) => <E>(fiber: Fiber<E, A>) =>
   _mapEffect(fiber, f);

/**
 * Maps over the value the fiber computes.
 */
export const _map: TC.UC_MapF<[F.URI], F.V> = (fa, f) => _mapEffect(fa, (a) => T.pure(f(a)));

/**
 * Maps over the value the fiber computes.
 */
export const map: TC.MapF<[F.URI], F.V> = (f) => (fa) => _map(fa, f);

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export const _mapBoth: TC.UC_MapBothF<[F.URI], F.V> = <E, E1, A, A1, B>(
   fa: Fiber<E, A>,
   fb: Fiber<E1, A1>,
   f: (a: A, b: A1) => B
): Synthetic<E | E1, B> => ({
   _tag: "SyntheticFiber",
   getRef: (ref) => T._mapBoth(fa.getRef(ref), fb.getRef(ref), (a, b) => ref.join(a, b)),
   inheritRefs: T._chain(fa.inheritRefs, () => fb.inheritRefs),
   interruptAs: (id) =>
      T._mapBoth(fa.interruptAs(id), fb.interruptAs(id), (ea, eb) =>
         Ex._bothMapCause(ea, eb, f, C.both)
      ),
   poll: T._mapBoth(fa.poll, fb.poll, (fa, fb) =>
      Mb._chain(fa, (ea) => Mb._map(fb, (eb) => Ex._bothMapCause(ea, eb, f, C.both)))
   ),
   await: T.result(_mapBothPar(T._chain(fa.await, T.done), T._chain(fb.await, T.done), f))
});

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export const mapBoth: TC.MapBothF<[F.URI], F.V> = (fb, f) => (fa) => _mapBoth(fa, fb, f);

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export const _both: TC.UC_BothF<[F.URI], F.V> = (fa, fb) => _mapBoth(fa, fb, (a, b) => [a, b]);

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export const both: TC.BothF<[F.URI], F.V> = (fb) => (fa) => _both(fa, fb);

export const _apFirst: TC.UC_ApFirstF<[F.URI], F.V> = (fa, fb) => _mapBoth(fa, fb, (a, _) => a);

export const apFirst: TC.ApFirstF<[F.URI], F.V> = (fb) => (fa) => _apFirst(fa, fb);

export const _apSecond: TC.UC_ApSecondF<[F.URI], F.V> = (fa, fb) => _mapBoth(fa, fb, (_, b) => b);

export const apSecond: TC.ApSecondF<[F.URI], F.V> = (fb) => (fa) => _apSecond(fa, fb);
