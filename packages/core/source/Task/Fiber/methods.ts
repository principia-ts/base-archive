import * as O from "../../Option";
import * as Ex from "../Exit";
import * as C from "../Exit/Cause";
import { mapBothPar_ } from "../Task/functions/mapBothPar";
import * as T from "./_internal/task";
import type { Fiber, SyntheticFiber } from "./model";

/**
 * Taskually maps over the value the fiber computes.
 */
export const mapTask_ = <E, E1, A, B>(fiber: Fiber<E, A>, f: (a: A) => T.EIO<E1, B>): SyntheticFiber<E | E1, B> => ({
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
 * Taskually maps over the value the fiber computes.
 */
export const mapTask = <A, E1, B>(f: (a: A) => T.EIO<E1, B>) => <E>(fiber: Fiber<E, A>) => mapTask_(fiber, f);

/**
 * Maps over the value the fiber computes.
 */
export const map_ = <E, A, B>(fa: Fiber<E, A>, f: (a: A) => B) => mapTask_(fa, (a) => T.pure(f(a)));

/**
 * Maps over the value the fiber computes.
 */
export const map = <A, B>(f: (a: A) => B) => <E>(fa: Fiber<E, A>) => map_(fa, f);

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export const mapBoth_ = <E, E1, A, A1, B>(
   fa: Fiber<E, A>,
   fb: Fiber<E1, A1>,
   f: (a: A, b: A1) => B
): SyntheticFiber<E | E1, B> => ({
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
export const mapBoth = <A, D, B, C>(fb: Fiber<D, B>, f: (a: A, b: B) => C) => <E>(fa: Fiber<E, A>) =>
   mapBoth_(fa, fb, f);

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export const both_ = <E, A, D, B>(fa: Fiber<E, A>, fb: Fiber<D, B>) => mapBoth_(fa, fb, (a, b) => [a, b]);

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export const both = <D, B>(fb: Fiber<D, B>) => <E, A>(fa: Fiber<E, A>) => both_(fa, fb);

export const apFirst_ = <E, A, D, B>(fa: Fiber<E, A>, fb: Fiber<D, B>) => mapBoth_(fa, fb, (a, _) => a);

export const apFirst = <D, B>(fb: Fiber<D, B>) => <E, A>(fa: Fiber<E, A>) => apFirst_(fa, fb);

export const apSecond_ = <E, A, D, B>(fa: Fiber<E, A>, fb: Fiber<D, B>) => mapBoth_(fa, fb, (_, b) => b);

export const apSecond = <D, B>(fb: Fiber<D, B>) => <E, A>(fa: Fiber<E, A>) => apSecond_(fa, fb);
