import * as O from "../../Option";
import * as Ex from "../Exit";
import * as C from "../Exit/Cause";
import { mapBothPar_ } from "../Task/apply-par";
import * as T from "./_internal/task";
import type { Fiber, SyntheticFiber } from "./model";

/**
 * Taskually maps over the value the fiber computes.
 */
export function mapM_<E, E1, A, B>(fiber: Fiber<E, A>, f: (a: A) => T.EIO<E1, B>): SyntheticFiber<E | E1, B> {
   return {
      _tag: "SyntheticFiber",
      await: T.chain_(fiber.await, Ex.foreachTask(f)),
      getRef: (ref) => fiber.getRef(ref),
      inheritRefs: fiber.inheritRefs,
      interruptAs: (id) => T.chain_(fiber.interruptAs(id), Ex.foreachTask(f)),
      poll: T.chain_(
         fiber.poll,
         O.fold(
            () => T.pure(O.none()),
            (a) => T.map_(Ex.foreachTask_(a, f), O.some)
         )
      )
   };
}

/**
 * Taskually maps over the value the fiber computes.
 */
export function mapM<A, E1, B>(f: (a: A) => T.EIO<E1, B>): <E>(fiber: Fiber<E, A>) => SyntheticFiber<E1 | E, B> {
   return (fiber) => mapM_(fiber, f);
}

/**
 * Maps over the value the fiber computes.
 */
export function map_<E, A, B>(fa: Fiber<E, A>, f: (a: A) => B) {
   return mapM_(fa, (a) => T.pure(f(a)));
}

/**
 * Maps over the value the fiber computes.
 */
export function map<A, B>(f: (a: A) => B): <E>(fa: Fiber<E, A>) => SyntheticFiber<E, B> {
   return (fa) => map_(fa, f);
}

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export function mapBoth_<E, E1, A, A1, B>(
   fa: Fiber<E, A>,
   fb: Fiber<E1, A1>,
   f: (a: A, b: A1) => B
): SyntheticFiber<E | E1, B> {
   return {
      _tag: "SyntheticFiber",
      getRef: (ref) => T.mapBoth_(fa.getRef(ref), fb.getRef(ref), (a, b) => ref.join(a, b)),
      inheritRefs: T.chain_(fa.inheritRefs, () => fb.inheritRefs),
      interruptAs: (id) =>
         T.mapBoth_(fa.interruptAs(id), fb.interruptAs(id), (ea, eb) => Ex.mapBothCause_(ea, eb, f, C.both)),
      poll: T.mapBoth_(fa.poll, fb.poll, (fa, fb) =>
         O.chain_(fa, (ea) => O.map_(fb, (eb) => Ex.mapBothCause_(ea, eb, f, C.both)))
      ),
      await: T.result(mapBothPar_(T.chain_(fa.await, T.done), T.chain_(fb.await, T.done), f))
   };
}

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export function mapBoth<A, D, B, C>(
   fb: Fiber<D, B>,
   f: (a: A, b: B) => C
): <E>(fa: Fiber<E, A>) => SyntheticFiber<D | E, C> {
   return (fa) => mapBoth_(fa, fb, f);
}

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export function both_<E, A, D, B>(fa: Fiber<E, A>, fb: Fiber<D, B>) {
   return mapBoth_(fa, fb, (a, b) => [a, b]);
}

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export function both<D, B>(fb: Fiber<D, B>): <E, A>(fa: Fiber<E, A>) => SyntheticFiber<D | E, (B | A)[]> {
   return (fa) => both_(fa, fb);
}

export function apFirst_<E, A, D, B>(fa: Fiber<E, A>, fb: Fiber<D, B>) {
   return mapBoth_(fa, fb, (a, _) => a);
}

export function apFirst<D, B>(fb: Fiber<D, B>): <E, A>(fa: Fiber<E, A>) => SyntheticFiber<D | E, A> {
   return (fa) => apFirst_(fa, fb);
}

export function apSecond_<E, A, D, B>(fa: Fiber<E, A>, fb: Fiber<D, B>) {
   return mapBoth_(fa, fb, (_, b) => b);
}

export function apSecond<D, B>(fb: Fiber<D, B>): <E, A>(fa: Fiber<E, A>) => SyntheticFiber<D | E, B> {
   return (fa) => apSecond_(fa, fb);
}
