import { makeInstruction } from "../Effect/Effect/model";
import type { XPure } from "./XPure";

export enum XPureInstructionTag {
   Pure = "Pure",
   Total = "Total",
   Partial = "Partial",
   Suspend = "Suspend",
   Fail = "Fail",
   Modify = "Modify",
   Chain = "Chain",
   Fold = "Fold",
   Read = "Read",
   Give = "Give"
}

export interface PureInstruction<A> extends XPure<unknown, never, unknown, never, A> {
   readonly _xptag: XPureInstructionTag.Pure;
   readonly value: A;
}

export const PureInstruction = <A>(value: A): PureInstruction<A> =>
   makeInstruction({
      _tag: "XPure",
      _xptag: XPureInstructionTag.Pure,
      value
   });

export interface TotalInstruction<A> extends XPure<unknown, never, unknown, never, A> {
   readonly _xptag: XPureInstructionTag.Total;
   readonly thunk: () => A;
}

export const TotalInstruction = <A>(thunk: () => A): TotalInstruction<A> =>
   makeInstruction({
      _tag: "XPure",
      _xptag: XPureInstructionTag.Total,
      thunk
   });

export interface PartialInstruction<E, A> extends XPure<unknown, never, unknown, E, A> {
   readonly _xptag: XPureInstructionTag.Partial;
   readonly thunk: () => A;
   readonly onThrow: (u: unknown) => E;
}

export const PartialInstruction = <E, A>(thunk: () => A, onThrow: (u: unknown) => E): PartialInstruction<E, A> =>
   makeInstruction({
      _tag: "XPure",
      _xptag: XPureInstructionTag.Partial,
      thunk,
      onThrow
   });

export interface SuspendInstruction<S1, S2, R, E, A> extends XPure<S1, S2, R, E, A> {
   readonly _xptag: XPureInstructionTag.Suspend;
   readonly factory: () => XPure<S1, S2, R, E, A>;
}

export const SuspendInstruction = <S1, S2, R, E, A>(
   factory: () => XPure<S1, S2, R, E, A>
): SuspendInstruction<S1, S2, R, E, A> =>
   makeInstruction({
      _tag: "XPure",
      _xptag: XPureInstructionTag.Suspend,
      factory
   });

export interface FailInstruction<E> extends XPure<unknown, never, unknown, E, never> {
   readonly _xptag: XPureInstructionTag.Fail;
   readonly e: E;
}

export const FailInstruction = <E>(e: E): FailInstruction<E> =>
   makeInstruction({
      _tag: "XPure",
      _xptag: XPureInstructionTag.Fail,
      e
   });

export interface ModifyInstruction<S1, S2, A> extends XPure<S1, S2, unknown, never, A> {
   readonly _xptag: XPureInstructionTag.Modify;
   readonly run: (s1: S1) => readonly [S2, A];
}

export const ModifyInstruction = <S1, S2, A>(run: (s1: S1) => readonly [S2, A]): ModifyInstruction<S1, S2, A> =>
   makeInstruction({
      _tag: "XPure",
      _xptag: XPureInstructionTag.Modify,
      run
   });

export interface ChainInstruction<S1, S2, R, E, A, S3, Q, D, B> extends XPure<S1, S3, Q & R, D | E, B> {
   readonly _xptag: XPureInstructionTag.Chain;
   readonly ma: XPure<S1, S2, R, E, A>;
   readonly f: (a: A) => XPure<S2, S3, Q, D, B>;
}

export const ChainInstruction = <S1, S2, R, E, A, S3, Q, D, B>(
   ma: XPure<S1, S2, R, E, A>,
   f: (a: A) => XPure<S2, S3, Q, D, B>
): ChainInstruction<S1, S2, R, E, A, S3, Q, D, B> =>
   makeInstruction({
      _tag: "XPure",
      _xptag: XPureInstructionTag.Chain,
      ma,
      f
   });

export interface FoldInstruction<S1, S2, S5, R, E, A, S3, R1, E1, B, S4, R2, E2, C>
   extends XPure<S1 & S5, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
   readonly _xptag: XPureInstructionTag.Fold;
   readonly fa: XPure<S1, S2, R, E, A>;
   readonly onFailure: (e: E) => XPure<S5, S3, R1, E1, B>;
   readonly onSuccess: (a: A) => XPure<S2, S4, R2, E2, C>;
}

export const FoldInstruction = <S1, S2, S5, R, E, A, S3, R1, E1, B, S4, R2, E2, C>(
   fa: XPure<S1, S2, R, E, A>,
   onFailure: (e: E) => XPure<S5, S3, R1, E1, B>,
   onSuccess: (a: A) => XPure<S2, S4, R2, E2, C>
): FoldInstruction<S1, S2, S5, R, E, A, S3, R1, E1, B, S4, R2, E2, C> =>
   makeInstruction({
      _tag: "XPure",
      _xptag: XPureInstructionTag.Fold,
      fa,
      onFailure,
      onSuccess
   });

export interface ReadInstruction<R0, S1, S2, R, E, A> extends XPure<S1, S2, R0 & R, E, A> {
   readonly _xptag: XPureInstructionTag.Read;
   readonly f: (r: R0) => XPure<S1, S2, R, E, A>;
}

export const ReadInstruction = <R0, S1, S2, R, E, A>(
   f: (r: R0) => XPure<S1, S2, R, E, A>
): ReadInstruction<R0, S1, S2, R, E, A> =>
   makeInstruction({
      _tag: "XPure",
      _xptag: XPureInstructionTag.Read,
      f
   });

export interface GiveInstruction<S1, S2, R, E, A> extends XPure<S1, S2, unknown, E, A> {
   readonly _xptag: XPureInstructionTag.Give;
   readonly fa: XPure<S1, S2, R, E, A>;
   readonly r: R;
}

export const GiveInstruction = <S1, S2, R, E, A>(fa: XPure<S1, S2, R, E, A>, r: R): GiveInstruction<S1, S2, R, E, A> =>
   makeInstruction({
      _tag: "XPure",
      _xptag: XPureInstructionTag.Give,
      fa,
      r
   });

export type Concrete<S1, S2, R, E, A> =
   | PureInstruction<A>
   | FailInstruction<E>
   | ModifyInstruction<S1, S2, A>
   | ChainInstruction<S1, unknown, S2, R, R, E, E, unknown, A>
   | FoldInstruction<S1, unknown, unknown, R, E, unknown, unknown, unknown, unknown, unknown, S2, unknown, unknown, A>
   | ReadInstruction<unknown, S1, S2, R, E, A>
   | GiveInstruction<S1, S2, R, E, A>
   | SuspendInstruction<S1, S2, R, E, A>
   | TotalInstruction<A>
   | PartialInstruction<E, A>;

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
