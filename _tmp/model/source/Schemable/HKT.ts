import type * as TC from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";
import type * as U from "@principia/prelude/Utils";

/**
 * A type-level dictionary for Interpreters
 */
export interface URItoInterpreter<
   IC,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E,
   A extends I0
> {}

export type ConcreteInterpreterURIS = keyof URItoInterpreter<
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any
>;

export interface InterpreterURI<IURI extends ConcreteInterpreterURIS, IC> {
   readonly _IF: IURI;
   readonly _IC: IC;
}

export type RealInterpreterURIS = ConcreteInterpreterURIS | InterpreterURI<ConcreteInterpreterURIS, any>;

export type InterpreterURIS = [RealInterpreterURIS, ...RealInterpreterURIS[]];

/**
 * Encodes an Interpreter type constructor
 */
export type InterpreterKind<
   IF extends ConcreteInterpreterURIS,
   IC,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E,
   A extends I0
> = URItoInterpreter<
   IC,
   F,
   C,
   I0,
   HKT.OrFix<"N", C, N>,
   HKT.OrFix<"K", C, K>,
   HKT.OrFix<"Q", C, Q>,
   HKT.OrFix<"W", C, W>,
   HKT.OrFix<"X", C, X>,
   HKT.OrFix<"I", C, I>,
   HKT.OrFix<"S", C, S>,
   HKT.OrFix<"R", C, R>,
   E,
   A
>[IF];

export interface InterpreterHKT<
   IURI,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E,
   A extends I0
> {
   _IURI: IURI;
   _F: F;
   _C: C;
   _I0: I0;
   _N: N;
   _K: K;
   _Q: Q;
   _W: W;
   _X: X;
   _I: I;
   _S: S;
   _R: R;
   _E: E;
   _A: A;
}

/**
 * A type-level dictionary for Algebras
 */
export interface URItoAlgebra<
   IURI extends ConcreteInterpreterURIS,
   IC,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E,
   A
> {}

export interface URItoAlgebraHKT<
   IURI,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E,
   A
> {}

export type Algebra<
   AURI extends AlgebraURIS,
   IURI,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E,
   A
> = U.UnionToIntersection<URItoAlgebraHKT<IURI, F, C, I0, N, K, Q, W, X, I, S, R, E, A>[AURI[number]]>;

export type AlgebraKind<
   AURI extends AlgebraURIS,
   IURI extends ConcreteInterpreterURIS,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E,
   A
> = U.UnionToIntersection<URItoAlgebra<IURI, HKT.Auto, F, C, I0, N, K, Q, W, X, I, S, R, E, A>[AURI[number]]>;

export type ConcreteAlgebraURIS = keyof URItoAlgebra<
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any,
   any
>;

export type AlgebraURIS = [ConcreteAlgebraURIS, ...ConcreteAlgebraURIS[]];

export type InferredAlgebra<
   IURI,
   PURI extends ProgramURIS,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E,
   A extends I0
> = Algebra<URItoProgramAlgebra[PURI], IURI, F, C, I0, N, K, Q, W, X, I, S, R, E, A>;

/**
 * An `Interpreter` implements an `Algebra`
 */
export type Interpreter<AURI extends AlgebraURIS, IURI extends ConcreteInterpreterURIS, E> = <
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   A
>(
   M: TC.MonadFail<F, C>
) => U.UnionToIntersection<URItoAlgebra<IURI, HKT.Auto, F, C, I0, N, K, Q, W, X, I, S, R, E, A>[AURI[number]]>;

export type Program<AURI extends AlgebraURIS> = {
   <
      IURI extends ConcreteInterpreterURIS,
      IC,
      F extends HKT.URIS,
      C extends HKT.Fix<"E", E>,
      I0,
      N extends string,
      K,
      Q,
      W,
      X,
      I,
      S,
      R,
      E,
      A extends I0
   >(
      I: (
         M: TC.MonadFail<F, C>
      ) => U.UnionToIntersection<URItoAlgebra<IURI, IC, F, C, I0, N, K, Q, W, X, I, S, R, E, A>[AURI[number]]>
   ): InterpreterKind<IURI, IC, F, C, I0, N, K, Q, W, X, I, S, R, E, A>;
};

export function implementInterpreter<
   AURIS extends AlgebraURIS,
   IURI extends ConcreteInterpreterURIS,
   E,
   IC = HKT.Auto
>(): (
   i: <F extends HKT.URIS, C extends HKT.Fix<"E", E>, I0, N extends string, K, Q, W, X, I, S, R, A>(_: {
      F: F;
      C: C;
   }) => (
      M: TC.MonadFail<F, C>
   ) => U.UnionToIntersection<URItoAlgebra<IURI, IC, F, C, I0, N, K, Q, W, X, I, S, R, E, A>[AURIS[number]]>
) => Interpreter<AURIS, IURI, E>;
export function implementInterpreter() {
   return (i: any) => i();
}

export interface URItoProgramAlgebra {}

export interface URItoProgram<I0, N extends string, K, Q, W, X, I, S, R, E, A extends I0> {}

export interface ProgramAlgebra<
   IURI,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E,
   A extends I0
> {}

export type ProgramURIS = keyof URItoProgram<any, any, any, any, any, any, any, any, any, any, any>;

const overloads = Symbol();

export type Overloads<I extends { [overloads]?: any }> = NonNullable<I[typeof overloads]>;

export interface InferredProgram<PURI extends ProgramURIS, I0, N extends string, K, Q, W, X, I, S, R, E, A extends I0> {
   <IURI, F extends HKT.URIS, C extends HKT.Fix<"E", E>>(
      a: ProgramAlgebra<IURI, F, C, I0, N, K, Q, W, X, I, S, R, E, A>[PURI]
   ): InterpreterHKT<IURI, F, C, I0, N, K, Q, W, X, I, S, R, E, A>;
   // [overloads]?: {
   //    <IURI extends ConcreteInterpreterURIS, F extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   //       a: AlgebraKind<URItoProgramAlgebra[PURI], IURI, F, C, I0, N, K, Q, W, X, I, S, R, E, A>
   //    ): InterpreterKind<IURI, HKT.Auto, F, C, I0, N, K, Q, W, X, I, S, R, E, A>;
   // };
}

export interface Summoner<PURI extends ProgramURIS, IURI extends ConcreteInterpreterURIS> {
   <I0, N extends string, K, Q, W, X, I, S, R, E, A extends I0>(
      F: InferredProgram<PURI, I0, N, K, Q, W, X, I, S, R, E, A>
   ): <F extends HKT.URIS, C extends HKT.Fix<"E", E>>(
      M: TC.MonadFail<F, C>
   ) => URItoInterpreter<HKT.Auto, F, C, I0, N, K, Q, W, X, I, S, R, E, A>[IURI];
}
