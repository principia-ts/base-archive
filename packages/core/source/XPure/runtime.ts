import { Stack } from "../Effect/Stack";
import * as E from "../Either";
import { concrete, fail, succeed } from "./constructors";
import type { Frame } from "./instructions";
import { ApplyFrame, FoldFrame, XPureInstructionTag } from "./instructions";
import type { XPure } from "./XPure";

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export const runStateEither_ = <S1, S2, E, A>(
   fa: XPure<S1, S2, unknown, E, A>,
   s: S1
): E.Either<E, readonly [S2, A]> => {
   let stack: Stack<Frame> | undefined = undefined;
   let s0 = s as any;
   let a = null;
   let r = null;
   let failed = false;
   let current = fa as XPure<any, any, any, any, any> | undefined;

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
         const next = pop();

         if (next == null) {
            unwinding = false;
         } else {
            if (next._xptag === "FoldFrame") {
               unwinding = false;
               push(new ApplyFrame(next.failure));
            }
         }
      }
   }

   while (current != null) {
      const xp = concrete(current);

      switch (xp._xptag) {
         case XPureInstructionTag.Chain: {
            const nested = concrete(xp.ma);
            const continuation = xp.f;

            switch (nested._xptag) {
               case XPureInstructionTag.Pure: {
                  current = continuation(nested.value);
                  break;
               }
               case XPureInstructionTag.Total: {
                  current = continuation(nested.thunk());
                  break;
               }
               case XPureInstructionTag.Partial: {
                  try {
                     current = succeed(nested.thunk());
                  } catch (e) {
                     current = fail(nested.onThrow(e));
                  }
                  break;
               }
               case XPureInstructionTag.Modify: {
                  const updated = nested.run(s0);

                  s0 = updated[0];
                  a = updated[1];

                  current = continuation(a);
                  break;
               }
               default: {
                  current = nested;
                  push(new ApplyFrame(continuation));
               }
            }

            break;
         }
         case XPureInstructionTag.Total: {
            a = xp.thunk();
            const nextInstruction = pop();
            if (nextInstruction) {
               current = nextInstruction.apply(a);
            } else {
               current = undefined;
            }
            break;
         }
         case XPureInstructionTag.Partial: {
            try {
               current = succeed(xp.thunk());
            } catch (e) {
               current = fail(xp.onThrow(e));
            }
            break;
         }
         case XPureInstructionTag.Suspend: {
            current = xp.factory();
            break;
         }
         case XPureInstructionTag.Pure: {
            a = xp.value;
            const nextInstr = pop();
            if (nextInstr) {
               current = nextInstr.apply(a);
            } else {
               current = undefined;
            }
            break;
         }
         case XPureInstructionTag.Fail: {
            findNextErrorHandler();
            const nextInst = pop();
            if (nextInst) {
               current = nextInst.apply(xp.e);
            } else {
               failed = true;
               a = xp.e;
               current = undefined;
            }
            break;
         }
         case XPureInstructionTag.Fold: {
            current = xp.fa;
            push(new FoldFrame(xp.onFailure, xp.onSuccess));
            break;
         }
         case XPureInstructionTag.Read: {
            current = xp.f(r);
            break;
         }
         case XPureInstructionTag.Give: {
            r = xp.r;
            current = xp.fa;
            break;
         }
         case XPureInstructionTag.Modify: {
            const updated = xp.run(s0);
            s0 = updated[0];
            a = updated[1];
            const nextInst = pop();
            if (nextInst) {
               current = nextInst.apply(a);
            } else {
               current = undefined;
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
): E.Either<E, readonly [S2, A]> => runStateEither_(fx, s);

/**
 * Runs this computation with the specified initial state, returning both
 * the updated state and the result.
 */
export const run_ = <S1, S2, A>(self: XPure<S1, S2, unknown, never, A>, s: S1) =>
   (runStateEither_(self, s) as E.Right<readonly [S2, A]>).right;

/**
 * Runs this computation with the specified initial state, returning both
 * updated state and the result
 */
export const run = <S1>(s: S1) => <S2, A>(self: XPure<S1, S2, unknown, never, A>): readonly [S2, A] => run_(self, s);

/**
 * Runs this computation, returning the result.
 */
export const runIO = <A>(self: XPure<unknown, unknown, unknown, never, A>) => run_(self, {})[1];

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and discarding the result.
 */
export const runState_ = <S1, S2, A>(self: XPure<S1, S2, unknown, never, A>, s: S1) =>
   (runStateEither_(self, s) as E.Right<readonly [S2, A]>).right[0];

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and discarding the result.
 */
export const runState = <S1>(s: S1) => <S2, A>(self: XPure<S1, S2, unknown, never, A>) => runState_(self, s);

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and the result.
 */
export const runStateResult_ = <S1, S2, A>(self: XPure<S1, S2, unknown, never, A>, s: S1) =>
   (runStateEither_(self, s) as E.Right<readonly [S2, A]>).right;

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and the result.
 */
export const runStateResult = <S1>(s: S1) => <S2, A>(self: XPure<S1, S2, unknown, never, A>) =>
   runStateResult_(self, s);

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export const runResult_ = <S1, S2, A>(self: XPure<S1, S2, unknown, never, A>, s: S1) =>
   (runStateEither_(self, s) as E.Right<readonly [S2, A]>).right[1];

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export const runResult = <S1>(s: S1) => <S2, A>(self: XPure<S1, S2, unknown, never, A>) => runResult_(self, s);

/**
 * Runs this computation returning either the result or error
 */
export const runEither = <E, A>(self: XPure<unknown, unknown, unknown, E, A>): E.Either<E, A> =>
   E.map_(runStateEither_(self, {}), ([_, x]) => x);
