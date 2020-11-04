import type { Either, Right } from "../Either";
import { left, right } from "../Either/constructors";
import { map_ as mapEither_ } from "../Either/functor";
import type { Stack } from "../support/Stack";
import { stack } from "../support/Stack";
import { fail, succeed } from "./constructors";
import type { XPure } from "./model";
import { _XPI, XPureInstructionTag } from "./model";
import { giveAll_ } from "./reader";

export class FoldFrame {
   readonly _xptag = "FoldFrame";
   constructor(
      readonly failure: (e: any) => XPure<any, any, any, any, any>,
      readonly apply: (e: any) => XPure<any, any, any, any, any>
   ) {}
}

export class ApplyFrame {
   readonly _xptag = "ApplyFrame";
   constructor(readonly apply: (e: any) => XPure<any, any, any, any, any>) {}
}

export type Frame = FoldFrame | ApplyFrame;

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export const runStateEither_ = <S1, S2, E, A>(fa: XPure<S1, S2, unknown, E, A>, s: S1): Either<E, readonly [S2, A]> => {
   let frames: Stack<Frame> | undefined = undefined;
   let state = s as any;
   let result = null;
   let environment = null;
   let failed = false;
   let current = fa as XPure<any, any, any, any, any> | undefined;

   function popContinuation() {
      const nextInstr = frames;
      if (nextInstr) {
         frames = frames?.previous;
      }
      return nextInstr?.value;
   }

   function pushContinuation(cont: Frame) {
      frames = stack(cont, frames);
   }

   function findNextErrorHandler() {
      let unwinding = true;
      while (unwinding) {
         const next = popContinuation();

         if (next == null) {
            unwinding = false;
         } else {
            if (next._xptag === "FoldFrame") {
               unwinding = false;
               pushContinuation(new ApplyFrame(next.failure));
            }
         }
      }
   }

   while (current != null) {
      const I = current[_XPI];

      switch (I._xptag) {
         case XPureInstructionTag.Chain: {
            const nested = I.ma[_XPI];
            const continuation = I.f;

            switch (nested._xptag) {
               case XPureInstructionTag.Succeed: {
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
                  const updated = nested.run(state);

                  state = updated[0];
                  result = updated[1];

                  current = continuation(result);
                  break;
               }
               default: {
                  current = nested;
                  pushContinuation(new ApplyFrame(continuation));
               }
            }

            break;
         }
         case XPureInstructionTag.Total: {
            result = I.thunk();
            const nextInstruction = popContinuation();
            if (nextInstruction) {
               current = nextInstruction.apply(result);
            } else {
               current = undefined;
            }
            break;
         }
         case XPureInstructionTag.Partial: {
            try {
               current = succeed(I.thunk());
            } catch (e) {
               current = fail(I.onThrow(e));
            }
            break;
         }
         case XPureInstructionTag.Suspend: {
            current = I.factory();
            break;
         }
         case XPureInstructionTag.Succeed: {
            result = I.value;
            const nextInstr = popContinuation();
            if (nextInstr) {
               current = nextInstr.apply(result);
            } else {
               current = undefined;
            }
            break;
         }
         case XPureInstructionTag.Fail: {
            findNextErrorHandler();
            const nextInst = popContinuation();
            if (nextInst) {
               current = nextInst.apply(I.e);
            } else {
               failed = true;
               result = I.e;
               current = undefined;
            }
            break;
         }
         case XPureInstructionTag.Fold: {
            current = I.fa;
            pushContinuation(new FoldFrame(I.onFailure, I.onSuccess));
            break;
         }
         case XPureInstructionTag.Asks: {
            current = I.f(environment);
            break;
         }
         case XPureInstructionTag.Give: {
            environment = I.r;
            current = I.fa;
            break;
         }
         case XPureInstructionTag.Modify: {
            const updated = I.run(state);
            state = updated[0];
            result = updated[1];
            const nextInst = popContinuation();
            if (nextInst) {
               current = nextInst.apply(result);
            } else {
               current = undefined;
            }
            break;
         }
      }
   }

   if (failed) {
      return left(result);
   }

   return right([state, result]);
};

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export const runStateEither = <S1>(s: S1) => <S2, E, A>(
   fx: XPure<S1, S2, unknown, E, A>
): Either<E, readonly [S2, A]> => runStateEither_(fx, s);

/**
 * Runs this computation with the specified initial state, returning both
 * the updated state and the result.
 */
export const run_ = <S1, S2, A>(self: XPure<S1, S2, unknown, never, A>, s: S1) =>
   (runStateEither_(self, s) as Right<readonly [S2, A]>).right;

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
   (runStateEither_(self, s) as Right<readonly [S2, A]>).right[0];

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
   (runStateEither_(self, s) as Right<readonly [S2, A]>).right;

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
   (runStateEither_(self, s) as Right<readonly [S2, A]>).right[1];

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export const runResult = <S1>(s: S1) => <S2, A>(self: XPure<S1, S2, unknown, never, A>) => runResult_(self, s);

/**
 * Runs this computation returning either the result or error
 */
export const runEither = <E, A>(self: XPure<never, unknown, unknown, E, A>): Either<E, A> =>
   mapEither_(runStateEither_(self, {} as never), ([_, x]) => x);

export const runEitherEnv_ = <R, E, A>(self: XPure<never, unknown, R, E, A>, env: R): Either<E, A> =>
   runEither(giveAll_(self, env));

export const runEitherEnv = <R>(env: R) => <E, A>(self: XPure<never, unknown, R, E, A>): Either<E, A> =>
   runEitherEnv_(self, env);
