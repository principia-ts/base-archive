import * as Mb from "@principia/core/Maybe";
import * as TC from "@principia/core/typeclass-index";

import * as C from "../Cause";
import { _mapBothPar } from "../Effect/functions/mapBothPar";
import * as Ex from "../Exit";
import * as T from "./_internal/effect";
import type { Fiber, Synthetic, URI, V } from "./Fiber";

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
export const _map: TC.UC_MapF<[URI], V> = (fa, f) => _mapEffect(fa, (a) => T.pure(f(a)));

/**
 * Maps over the value the fiber computes.
 */
export const map: TC.MapF<[URI], V> = (f) => (fa) => _map(fa, f);

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export const _mapBoth: TC.UC_MapBothF<[URI], V> = <E, E1, A, A1, B>(
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
export const mapBoth: TC.MapBothF<[URI], V> = (fb, f) => (fa) => _mapBoth(fa, fb, f);

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export const _both: TC.UC_BothF<[URI], V> = (fa, fb) => _mapBoth(fa, fb, (a, b) => [a, b]);

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export const both: TC.BothF<[URI], V> = (fb) => (fa) => _both(fa, fb);

export const _apFirst: TC.UC_ApFirstF<[URI], V> = (fa, fb) => _mapBoth(fa, fb, (a, _) => a);

export const apFirst: TC.ApFirstF<[URI], V> = (fb) => (fa) => _apFirst(fa, fb);

export const _apSecond: TC.UC_ApSecondF<[URI], V> = (fa, fb) => _mapBoth(fa, fb, (_, b) => b);

export const apSecond: TC.ApSecondF<[URI], V> = (fb) => (fa) => _apSecond(fa, fb);
