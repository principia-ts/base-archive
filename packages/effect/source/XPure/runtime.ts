import * as E from "@principia/core/Either";

import { Stack } from "../Stack";
import { concrete, fail, succeed } from "./constructors";
import type { Frame } from "./instructions";
import { ApplyFrame, FoldFrame } from "./instructions";
import type { XPure } from "./XPure";

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export const _runStateEither = <S1, S2, E, A>(
   fx: XPure<S1, S2, unknown, E, A>,
   s: S1
): E.Either<E, readonly [S2, A]> => {
   let stack: Stack<Frame> | undefined = undefined;
   let s0 = s as any;
   let a = null;
   let r = null;
   let failed = false;
   let curXPure = fx as XPure<any, any, any, any, any> | undefined;

   function pop() {
      const nextInstr = stack;
      if (nextInstr) {
         stack = stack?.previous;
      }
      return nextInstr?.value;
   }

   function push(cont: Frame) {
      stack = new Stack(cont, stack);
   }

   function findNextErrorHandler() {
      let unwinding = true;
      while (unwinding) {
         const nextInstr = pop();

         if (nextInstr == null) {
            unwinding = false;
         } else {
            if (nextInstr._xptag === "FoldFrame") {
               unwinding = false;
               push(new ApplyFrame(nextInstr.failure));
            }
         }
      }
   }

   while (curXPure != null) {
      const xp = concrete(curXPure);

      switch (xp._xptag) {
         case "FlatMap": {
            const nested = concrete(xp.ma);
            const continuation = xp.f;

            switch (nested._xptag) {
               case "Pure": {
                  curXPure = continuation(nested.a);
                  break;
               }
               case "Total": {
                  curXPure = continuation(nested.thunk());
                  break;
               }
               case "Partial": {
                  try {
                     curXPure = succeed(nested.thunk());
                  } catch (e) {
                     curXPure = fail(nested.onThrow(e));
                  }
                  break;
               }
               case "Modify": {
                  const updated = nested.run(s0);

                  s0 = updated[0];
                  a = updated[1];

                  curXPure = continuation(a);
                  break;
               }
               default: {
                  curXPure = nested;
                  push(new ApplyFrame(continuation));
               }
            }

            break;
         }
         case "Total": {
            a = xp.thunk();
            const nextInstruction = pop();
            if (nextInstruction) {
               curXPure = nextInstruction.apply(a);
            } else {
               curXPure = undefined;
            }
            break;
         }
         case "Partial": {
            try {
               curXPure = succeed(xp.thunk());
            } catch (e) {
               curXPure = fail(xp.onThrow(e));
            }
            break;
         }
         case "Suspend": {
            curXPure = xp.factory();
            break;
         }
         case "Pure": {
            a = xp.a;
            const nextInstr = pop();
            if (nextInstr) {
               curXPure = nextInstr.apply(a);
            } else {
               curXPure = undefined;
            }
            break;
         }
         case "Fail": {
            findNextErrorHandler();
            const nextInst = pop();
            if (nextInst) {
               curXPure = nextInst.apply(xp.e);
            } else {
               failed = true;
               a = xp.e;
               curXPure = undefined;
            }
            break;
         }
         case "Fold": {
            curXPure = xp.fa;
            push(new FoldFrame(xp.onFailure, xp.onSuccess));
            break;
         }
         case "Access": {
            curXPure = xp.access(r);
            break;
         }
         case "Provide": {
            r = xp.r;
            curXPure = xp.fa;
            break;
         }
         case "Modify": {
            const updated = xp.run(s0);
            s0 = updated[0];
            a = updated[1];
            const nextInst = pop();
            if (nextInst) {
               curXPure = nextInst.apply(a);
            } else {
               curXPure = undefined;
            }
            break;
         }
      }
   }

   if (failed) {
      return E.left(a);
   }

   return E.right([s0, a]);
};

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export const runStateEither = <S1>(s: S1) => <S2, E, A>(
   fx: XPure<S1, S2, unknown, E, A>
): E.Either<E, readonly [S2, A]> => _runStateEither(fx, s);

/**
 * Runs this computation with the specified initial state, returning both
 * the updated state and the result.
 */
export const _run = <S1, S2, A>(self: XPure<S1, S2, unknown, never, A>, s: S1) =>
   (_runStateEither(self, s) as E.Right<readonly [S2, A]>).right;

/**
 * Runs this computation with the specified initial state, returning both
 * updated state and the result
 */
export const run = <S1>(s: S1) => <S2, A>(self: XPure<S1, S2, unknown, never, A>): readonly [S2, A] => _run(self, s);

/**
 * Runs this computation, returning the result.
 */
export const runIO = <A>(self: XPure<unknown, unknown, unknown, never, A>) => _run(self, {})[1];

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and discarding the result.
 */
export const _runState = <S1, S2, A>(self: XPure<S1, S2, unknown, never, A>, s: S1) =>
   (_runStateEither(self, s) as E.Right<readonly [S2, A]>).right[0];

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and discarding the result.
 */
export const runState = <S1>(s: S1) => <S2, A>(self: XPure<S1, S2, unknown, never, A>) => _runState(self, s);

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and the result.
 */
export const _runStateResult = <S1, S2, A>(self: XPure<S1, S2, unknown, never, A>, s: S1) =>
   (_runStateEither(self, s) as E.Right<readonly [S2, A]>).right;

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and the result.
 */
export const runStateResult = <S1>(s: S1) => <S2, A>(self: XPure<S1, S2, unknown, never, A>) =>
   _runStateResult(self, s);

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export const _runResult = <S1, S2, A>(self: XPure<S1, S2, unknown, never, A>, s: S1) =>
   (_runStateEither(self, s) as E.Right<readonly [S2, A]>).right[1];

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export const runResult = <S1>(s: S1) => <S2, A>(self: XPure<S1, S2, unknown, never, A>) => _runResult(self, s);

/**
 * Runs this computation returning either the result or error
 */
export const runEither = <E, A>(self: XPure<unknown, unknown, unknown, E, A>): E.Either<E, A> =>
   E.map_(_runStateEither(self, {}), ([_, x]) => x);
