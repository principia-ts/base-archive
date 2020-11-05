import type { UnionToIntersection } from "@principia/prelude/Utils";

import { AtomicReference } from "../../support";
import type { Cause } from "../Exit/Cause";
import type { Managed } from "../Managed/model";
import type { DefaultEnv } from "../Task";

/*
 * -------------------------------------------
 * Layer Model
 * -------------------------------------------
 */

export const URI = "Layer";

export type URI = typeof URI;

export abstract class Layer<R, E, A> {
   readonly hash = new AtomicReference<PropertyKey>(Symbol());

   readonly _R!: (_: R) => void;
   readonly _E!: () => E;
   readonly _Out!: () => A;

   setKey(hash: symbol) {
      this.hash.set(hash);
      return this;
   }

   ["_I"](): LayerInstruction {
      return this as any;
   }
}

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Layer<R, E, A>;
   }
}

export enum LayerInstructionTag {
   Fold = "LayerFold",
   Map = "LayerMap",
   Chain = "LayerChain",
   Fresh = "LayerRefresh",
   Managed = "LayerManaged",
   Suspend = "LayerSuspend",
   MapBothPar = "LayerMapBothPar",
   AllPar = "LayerAllPar",
   AllSeq = "LayerAllSeq",
   MapBothSeq = "LayerMapBothSeq"
}

/**
 * Type level bound to make sure a layer is complete
 */
export const main = <E, A>(layer: Layer<DefaultEnv, E, A>) => layer;

export type LayerInstruction =
   | LayerFoldInstruction<any, any, any, any, any, any, any, any>
   | LayerMapInstruction<any, any, any, any>
   | LayerChainInstruction<any, any, any, any, any, any>
   | LayerChainInstruction<any, any, any, any, any, any>
   | LayerFreshInstruction<any, any, any>
   | LayerManagedInstruction<any, any, any>
   | LayerSuspendInstruction<any, any, any>
   | LayerMapBothParInstruction<any, any, any, any, any, any, any>
   | LayerMapBothSeqInstruction<any, any, any, any, any, any, any>
   | LayerAllParInstruction<Layer<any, any, any>[]>
   | LayerAllSeqInstruction<Layer<any, any, any>[]>;

export class LayerFoldInstruction<RIn, E, ROut, E1, ROut1, R, E2, ROut2> extends Layer<
   RIn & R,
   E1 | E2,
   ROut1 | ROut2
> {
   readonly _tag = LayerInstructionTag.Fold;

   constructor(
      readonly layer: Layer<RIn, E, ROut>,
      readonly onFailure: Layer<readonly [RIn, Cause<E>], E1, ROut1>,
      readonly onSuccess: Layer<ROut & R, E2, ROut2>
   ) {
      super();
   }
}

export class LayerMapInstruction<R, E, A, B> extends Layer<R, E, B> {
   readonly _tag = LayerInstructionTag.Map;

   constructor(readonly layer: Layer<R, E, A>, readonly f: (a: A) => B) {
      super();
   }
}

export class LayerChainInstruction<R, E, A, R1, E1, B> extends Layer<R & R1, E | E1, B> {
   readonly _tag = LayerInstructionTag.Chain;

   constructor(readonly layer: Layer<R, E, A>, readonly f: (a: A) => Layer<R1, E1, B>) {
      super();
   }
}

export class LayerFreshInstruction<R, E, A> extends Layer<R, E, A> {
   readonly _tag = LayerInstructionTag.Fresh;

   constructor(readonly layer: Layer<R, E, A>) {
      super();
   }
}

export class LayerManagedInstruction<R, E, A> extends Layer<R, E, A> {
   readonly _tag = LayerInstructionTag.Managed;

   constructor(readonly managed: Managed<R, E, A>) {
      super();
   }
}

export class LayerSuspendInstruction<R, E, A> extends Layer<R, E, A> {
   readonly _tag = LayerInstructionTag.Suspend;

   constructor(readonly factory: () => Layer<R, E, A>) {
      super();
   }
}

export type MergeR<Ls extends Layer<any, any, any>[]> = UnionToIntersection<
   {
      [k in keyof Ls]: [Ls[k]] extends [Layer<infer X, any, any>] ? (unknown extends X ? never : X) : never;
   }[number]
>;

export type MergeE<Ls extends Layer<any, any, any>[]> = {
   [k in keyof Ls]: [Ls[k]] extends [Layer<any, infer X, any>] ? X : never;
}[number];

export type MergeA<Ls extends Layer<any, any, any>[]> = UnionToIntersection<
   {
      [k in keyof Ls]: [Ls[k]] extends [Layer<any, any, infer X>] ? (unknown extends X ? never : X) : never;
   }[number]
>;

export class LayerMapBothParInstruction<R, E, A, R1, E1, B, C> extends Layer<R & R1, E | E1, C> {
   readonly _tag = LayerInstructionTag.MapBothPar;

   constructor(readonly layer: Layer<R, E, A>, readonly that: Layer<R1, E1, B>, readonly f: (a: A, b: B) => C) {
      super();
   }
}

export class LayerAllParInstruction<Ls extends Layer<any, any, any>[]> extends Layer<
   MergeR<Ls>,
   MergeE<Ls>,
   MergeA<Ls>
> {
   readonly _tag = LayerInstructionTag.AllPar;

   constructor(readonly layers: Ls & { 0: Layer<any, any, any> }) {
      super();
   }
}

export class LayerMapBothSeqInstruction<R, E, A, R1, E1, B, C> extends Layer<R & R1, E | E1, C> {
   readonly _tag = LayerInstructionTag.MapBothSeq;

   constructor(readonly layer: Layer<R, E, A>, readonly that: Layer<R1, E1, B>, readonly f: (a: A, b: B) => C) {
      super();
   }
}

export class LayerAllSeqInstruction<Ls extends Layer<any, any, any>[]> extends Layer<
   MergeR<Ls>,
   MergeE<Ls>,
   MergeA<Ls>
> {
   readonly _tag = LayerInstructionTag.AllSeq;

   constructor(readonly layers: Ls & { 0: Layer<any, any, any> }) {
      super();
   }
}
