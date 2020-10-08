import * as O from "@principia/core/Option";
import type * as TC from "@principia/core/typeclass-index";

import * as C from "../Cause";
import { mapBothPar_ } from "../Effect/functions/mapBothPar";
import * as Ex from "../Exit";
import * as T from "./_internal/effect";
import type { Fiber, Synthetic, URI, V } from "./Fiber";

/**
 * Effectually maps over the value the fiber computes.
 */
export const mapEffect_ = <E, E1, A, B>(fiber: Fiber<E, A>, f: (a: A) => T.IO<E1, B>): Synthetic<E | E1, B> => ({
   _tag: "SyntheticFiber",
   await: T.chain_(fiber.await, Ex.foreach(f)),
   getRef: (ref) => fiber.getRef(ref),
   inheritRefs: fiber.inheritRefs,
   interruptAs: (id) => T.chain_(fiber.interruptAs(id), Ex.foreach(f)),
   poll: T.chain_(
      fiber.poll,
      O.fold(
         () => T.pure(O.none()),
         (a) => T.map_(Ex.foreach_(a, f), O.some)
      )
   )
});

/**
 * Effectually maps over the value the fiber computes.
 */
export const mapEffect = <A, E1, B>(f: (a: A) => T.IO<E1, B>) => <E>(fiber: Fiber<E, A>) => mapEffect_(fiber, f);

/**
 * Maps over the value the fiber computes.
 */
export const map_: TC.UC_MapF<[URI], V> = (fa, f) => mapEffect_(fa, (a) => T.pure(f(a)));

/**
 * Maps over the value the fiber computes.
 */
export const map: TC.MapF<[URI], V> = (f) => (fa) => map_(fa, f);

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export const mapBoth_: TC.UC_MapBothF<[URI], V> = <E, E1, A, A1, B>(
   fa: Fiber<E, A>,
   fb: Fiber<E1, A1>,
   f: (a: A, b: A1) => B
): Synthetic<E | E1, B> => ({
   _tag: "SyntheticFiber",
   getRef: (ref) => T.mapBoth_(fa.getRef(ref), fb.getRef(ref), (a, b) => ref.join(a, b)),
   inheritRefs: T.chain_(fa.inheritRefs, () => fb.inheritRefs),
   interruptAs: (id) =>
      T.mapBoth_(fa.interruptAs(id), fb.interruptAs(id), (ea, eb) => Ex.bothMapCause_(ea, eb, f, C.both)),
   poll: T.mapBoth_(fa.poll, fb.poll, (fa, fb) =>
      O.chain_(fa, (ea) => O.map_(fb, (eb) => Ex.bothMapCause_(ea, eb, f, C.both)))
   ),
   await: T.result(mapBothPar_(T.chain_(fa.await, T.done), T.chain_(fb.await, T.done), f))
});

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export const mapBoth: TC.MapBothF<[URI], V> = (fb, f) => (fa) => mapBoth_(fa, fb, f);

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export const both_: TC.UC_BothF<[URI], V> = (fa, fb) => mapBoth_(fa, fb, (a, b) => [a, b]);

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export const both: TC.BothF<[URI], V> = (fb) => (fa) => both_(fa, fb);

export const apFirst_: TC.UC_ApFirstF<[URI], V> = (fa, fb) => mapBoth_(fa, fb, (a, _) => a);

export const apFirst: TC.ApFirstF<[URI], V> = (fb) => (fa) => apFirst_(fa, fb);

export const apSecond_: TC.UC_ApSecondF<[URI], V> = (fa, fb) => mapBoth_(fa, fb, (_, b) => b);

export const apSecond: TC.ApSecondF<[URI], V> = (fb) => (fa) => apSecond_(fa, fb);
