import type * as H from "@principia/prelude/HKT";
import type { UnionToIntersection } from "@principia/prelude/Utils";

import { memoize } from "../utils";
import { OpticsFor } from "./optics";
import type { CacheType, InhabitedTypes, SelectKeyOfMatchingValues } from "./utils";
import { assignCallable, assignFunction, inhabitTypes, wrapFun } from "./utils";

/*
 * -------------------------------------------
 * Interpreter
 * -------------------------------------------
 */

export interface InterpretedHKT<URI, Env, S, R, E, A> {
   readonly _URI: URI;
   readonly _Env: (_: Env) => void;
   readonly _S: S;
   readonly _R: R;
   readonly _E: E;
   readonly _A: A;
}

export const UIHKT = "model/HKT";

export type UIHKT = typeof UIHKT;

export interface URItoInterpreted<Env, S, R, E, A> {
   readonly _Env: Env;
   readonly _S: S;
   readonly _R: R;
   readonly _E: E;
   readonly _A: A;
   readonly [UIHKT]: InterpretedHKT<UIHKT, Env, S, R, E, A>;
}

export type InterpreterURIS = Exclude<
   keyof URItoInterpreted<any, any, any, any, any>,
   "_Env" | "_S" | "_R" | "_E" | "_A"
>;

export type Param = "S" | "R" | "E" | "A";

export type InterpretedKind<URI extends InterpreterURIS, Env extends AnyEnv, S, R, E, A> = URI extends InterpreterURIS
   ? URItoInterpreted<Env, S, R, E, A>[URI]
   : never;

export function implementInterpreter<IURI extends InterpreterURIS, AURI extends AlgebraURIS>(): (
   i: <Env extends AnyEnv>(_: { Env: Env }) => Algebra<AURI, IURI, Env>
) => <Env>() => Algebra<AURI, IURI, Env>;
export function implementInterpreter() {
   return (i: () => any) => memoize(i);
}

/*
 * -------------------------------------------
 * Algebra
 * -------------------------------------------
 */

/*
 * export interface URItoAlgebraHKT<IURI, Env> {
 *    readonly _IURI: IURI;
 *    readonly _Env: Env;
 * }
 */

export interface URItoAlgebra<IURI extends InterpreterURIS, Env extends AnyEnv> {}

export type AlgebraURIS = keyof URItoAlgebra<any, any>;

/*
 * export type AlgebraHKT<AURI extends AlgebraURIS, IURI, Env> = UnionToIntersection<URItoAlgebraHKT<IURI, Env>[AURI]>;
 */

export type Algebra<AURI extends AlgebraURIS, IURI extends InterpreterURIS, Env extends AnyEnv> = UnionToIntersection<
   URItoAlgebra<IURI, Env>[AURI]
>;

/*
 * -------------------------------------------
 * Config
 * -------------------------------------------
 */

export type InterpreterURISIndexedAny = Record<InterpreterURIS, any>;

export type AnyEnv = Partial<InterpreterURISIndexedAny>;

export type NoEnv = unknown;

export type MapToConfig<Env extends AnyEnv, T extends InterpreterURISIndexedAny, Custom> = {
   [IURI in InterpreterURIS]?: (a: T[IURI], env: Env[IURI], k: ThreadURI<Custom, IURI>) => T[IURI];
};

export interface URItoConfig<S, R, E, A> {
   readonly [UIHKT]: never;
}

export type Config<Env extends AnyEnv, S, R, E, A, Custom = {}> = {
   name?: string;
   id?: string;
   message?: string;
   config?: MapToConfig<Env, URItoConfig<S, R, E, A>, Custom>;
};

export type ThreadURI<C, IURI extends InterpreterURIS> = IURI extends keyof C ? C[IURI] : unknown;

export const getApplyConfig: <IURI extends InterpreterURIS>(
   uri: IURI
) => <Config>(config?: Config) => NonNullable<ThreadURI<Config, IURI>> = (uri) => (config) =>
   ((a: any, r: any, k: any) =>
      ((config && (config as any)[uri] ? (config as any)[uri] : <A>(a: A) => a) as any)(a, r[uri], k)) as any;

/*
 * -------------------------------------------
 * Program
 * -------------------------------------------
 */

export interface URItoProgram<Env extends AnyEnv, S, R, E, A> {}

export type ProgramURIS = keyof URItoProgram<any, any, any, any, any>;

export interface URItoProgramAlgebra<Env extends AnyEnv> {}

export interface URItoAURIS {}

export const _overloads: unique symbol = Symbol();

export type Overloads<I extends { [_overloads]?: any }> = NonNullable<I[typeof _overloads]>;

export const interpretable = <T extends { [_overloads]?: any }>(program: T): Overloads<T> => program as Overloads<T>;

export type InferredAlgebra<PURI extends ProgramURIS, Env extends AnyEnv> = Algebra<URItoAURIS[PURI], UIHKT, Env>;

export interface InferredProgram<PURI extends ProgramURIS, Env extends AnyEnv, S, R, E, A> {
   <LEnv extends Env>(a: URItoProgramAlgebra<Env>[PURI]): InterpretedHKT<UIHKT, LEnv, S, R, E, A>;
   [_overloads]?: {
      <F extends Exclude<InterpreterURIS, UIHKT>>(a: Algebra<URItoAURIS[PURI], F, Env>): InterpretedKind<
         F,
         { [K in F & keyof Env]: Env[K] },
         S,
         R,
         E,
         A
      >;
   };
}

/*
 * -------------------------------------------
 * Materializer
 * (program interpreter)
 * -------------------------------------------
 */

export interface URItoResult<S, R, E, A> extends Record<string, { build: (x: A) => A }> {}

export type ResultURIS = keyof URItoResult<any, any, any, any>;

export type SelectResultURIS<S, R, E, A, ShapeConstraint> = SelectKeyOfMatchingValues<
   URItoResult<S, R, E, A>,
   ShapeConstraint
>;

export interface ProgramInterpreter<PURI extends ProgramURIS, RURI extends ResultURIS> {
   <Env extends AnyEnv, S, R, E, A>(program: URItoProgram<Env, S, R, E, A>[PURI]): URItoResult<S, R, E, A>[RURI];
}

/*
 * -------------------------------------------
 * Morph
 * -------------------------------------------
 */

export interface Interpretable<PURI extends ProgramURIS, Env extends AnyEnv, S, R, E, A> {
   derive: Overloads<URItoProgram<Env, S, R, E, A>[PURI]>;
}

export interface InhabitedInterpreterAndAlgebra<PURI extends ProgramURIS, RURI extends ResultURIS> {
   readonly _P: PURI;
   readonly _M: RURI;
}

const inhabitInterpreterAndAlgebra = <PURI extends ProgramURIS, RURI extends ResultURIS, T>(
   t: T
): T & InhabitedInterpreterAndAlgebra<PURI, RURI> => t as T & InhabitedInterpreterAndAlgebra<PURI, RURI>;

export type Morph<PURI extends ProgramURIS, RURI extends ResultURIS, Env extends AnyEnv, S, R, E, A> = URItoResult<
   S,
   R,
   E,
   A
>[RURI] &
   URItoProgram<Env, S, R, E, A>[PURI] &
   URItoResult<S, R, E, A>[RURI] &
   InhabitedTypes<Env, S, R, E, A> &
   Interpretable<PURI, Env, S, R, E, A> &
   InhabitedInterpreterAndAlgebra<PURI, RURI> &
   OpticsFor<A>;

function interpret<PURI extends ProgramURIS, RURI extends ResultURIS, Env extends AnyEnv, S, R, E, A>(
   program: URItoProgram<Env, S, R, E, A>[PURI],
   programInterpreter: ProgramInterpreter<PURI, RURI>
): Morph<PURI, RURI, Env, S, R, E, A> & InhabitedTypes<Env, S, R, E, A> {
   return inhabitInterpreterAndAlgebra(
      inhabitTypes(assignFunction(wrapFun(program as any), programInterpreter(program)))
   );
}

export function materialize<PURI extends ProgramURIS, IURI extends InterpreterURIS, Env extends AnyEnv, S, R, E, A>(
   program: URItoProgram<Env, S, R, E, A>[PURI],
   programInterpreter: ProgramInterpreter<PURI, IURI>
): Morph<PURI, IURI, Env, S, R, E, A> {
   const morph = interpret(program, programInterpreter);
   return assignCallable(morph, {
      ...OpticsFor<A>(),
      derive: interpretable(morph)
   });
}

/*
 * -------------------------------------------
 * Summoner
 * -------------------------------------------
 */

export interface Summoners<PURI extends ProgramURIS, RURI extends ResultURIS, Env extends AnyEnv> {
   <S, R, E, A>(F: InferredProgram<PURI, Env, S, R, E, A>): Morph<PURI, RURI, Env, S, R, E, A>;
   readonly _P: PURI;
   readonly _M: RURI;
   readonly _Env: (_: Env) => void;
}

export type SummonerPURI<X extends Summoners<any, any, any>> = NonNullable<X["_P"]>;

export type SummonerRURI<X extends Summoners<any, any, any>> = NonNullable<X["_M"]>;

export type SummonerEnv<X extends Summoners<any, any, any>> = NonNullable<Parameters<X["_Env"]>[0]>;

export interface SummonerOps<S extends Summoners<any, any, any> = never> {
   readonly make: S;
}

export function makeSummoner<Su extends Summoners<any, any, any> = never>(
   cacheProgramEval: CacheType,
   programInterpreter: <S, R, E, A>(
      program: Overloads<URItoProgram<SummonerEnv<Su>, S, R, E, A>[SummonerPURI<Su>]>
   ) => URItoResult<S, R, E, A>[SummonerRURI<Su>]
): SummonerOps<Su> {
   type PURI = SummonerPURI<Su>;
   type IURI = SummonerRURI<Su>;
   type Env = SummonerEnv<Su>;

   type P<S, R, E, A> = URItoProgram<Env, S, R, E, A>[PURI];
   type M<S, R, E, A> = Morph<PURI, IURI, Env, S, R, E, A>;

   const summon = (<S, R, E, A>(F: P<S, R, E, A>): M<S, R, E, A> =>
      materialize(
         cacheProgramEval(F),
         programInterpreter as <S, R, E, A>(program: P<S, R, E, A>) => URItoResult<S, R, E, A>[IURI]
      )) as Su;
   return {
      make: summon
   };
}

export type ExtractEnv<Env extends AnyEnv, SummonerEnv extends InterpreterURIS> = {
   [k in SummonerEnv & keyof Env]: NonNullable<Env>[k & keyof Env];
};

/*
 * -------------------------------------------
 * Configs
 * -------------------------------------------
 */

export type TaggedUnion1<Types, URI extends H.URIS1, TC = H.Auto> = {
   [k in keyof Types]: Types[k] extends InterpretedHKT<infer U, infer Env, infer S, infer R, infer E, infer A>
      ? H.Kind1<URI, TC, A>
      : Types[k] extends Morph<infer PU, infer RU, infer Env, infer S, infer R, infer E, infer A>
      ? H.Kind1<URI, TC, A>
      : Types[k] extends [infer S, infer R, infer E, infer A]
      ? H.Kind1<URI, TC, A>
      : never;
};

export type TaggedUnion2<Types, URI extends H.URIS2, TC = H.Auto> = {
   [k in keyof Types]: Types[k] extends InterpretedHKT<infer U, infer Env, infer S, infer R, infer E, infer A>
      ? H.Kind2<URI, TC, E, A>
      : Types[k] extends Morph<infer PU, infer RU, infer Env, infer S, infer R, infer E, infer A>
      ? H.Kind2<URI, TC, E, A>
      : Types[k] extends [infer S, infer R, infer E, infer A]
      ? H.Kind2<URI, TC, E, A>
      : never;
};

export type TaggedUnion3<Types, URI extends H.URIS3, TC = H.Auto> = {
   [k in keyof Types]: Types[k] extends InterpretedHKT<infer U, infer Env, infer S, infer R, infer E, infer A>
      ? H.Kind3<URI, TC, R, E, A>
      : Types[k] extends Morph<infer PU, infer RU, infer Env, infer S, infer R, infer E, infer A>
      ? H.Kind3<URI, TC, R, E, A>
      : Types[k] extends [infer S, infer R, infer E, infer A]
      ? H.Kind3<URI, TC, R, E, A>
      : never;
};

export type TaggedUnion4<Types, URI extends H.URIS4, TC = H.Auto> = {
   [k in keyof Types]: Types[k] extends InterpretedHKT<infer U, infer Env, infer S, infer R, infer E, infer A>
      ? H.Kind4<URI, TC, S, R, E, A>
      : Types[k] extends Morph<infer PU, infer RU, infer Env, infer S, infer R, infer E, infer A>
      ? H.Kind4<URI, TC, S, R, E, A>
      : Types[k] extends [infer S, infer R, infer E, infer A]
      ? H.Kind4<URI, TC, S, R, E, A>
      : never;
};

export type Intersection1<A extends unknown[], URI extends H.URIS1, TC = H.Auto> = A extends [infer X, infer Y]
   ? [H.Kind1<URI, TC, X>, H.Kind1<URI, TC, Y>]
   : A extends [infer X, infer Y, infer Z]
   ? [H.Kind1<URI, TC, X>, H.Kind1<URI, TC, Y>, H.Kind1<URI, TC, Z>]
   : A extends [infer X, infer Y, infer Z, infer W]
   ? [H.Kind1<URI, TC, X>, H.Kind1<URI, TC, Y>, H.Kind1<URI, TC, Z>, H.Kind1<URI, TC, W>]
   : A extends [infer X, infer Y, infer Z, infer W, infer K]
   ? [H.Kind1<URI, TC, X>, H.Kind1<URI, TC, Y>, H.Kind1<URI, TC, Z>, H.Kind1<URI, TC, W>, H.Kind1<URI, TC, K>]
   : H.Kind1<URI, TC, UnionToIntersection<A[number]>>[];

export type Intersection2<E extends unknown[], A extends unknown[], URI extends H.URIS2, TC = H.Auto> = [E, A] extends [
   [infer E1, infer E2],
   [infer A1, infer A2]
]
   ? [H.Kind2<URI, TC, E1, A1>, H.Kind2<URI, TC, E2, A2>]
   : [E, A] extends [[infer E1, infer E2, infer E3], [infer A1, infer A2, infer A3]]
   ? [H.Kind2<URI, TC, E1, A1>, H.Kind2<URI, TC, E2, A2>, H.Kind2<URI, TC, E3, A3>]
   : [E, A] extends [[infer E1, infer E2, infer E3, infer E4], [infer A1, infer A2, infer A3, infer A4]]
   ? [H.Kind2<URI, TC, E1, A1>, H.Kind2<URI, TC, E2, A2>, H.Kind2<URI, TC, E3, A3>, H.Kind2<URI, TC, E4, A4>]
   : [E, A] extends [
        [infer E1, infer E2, infer E3, infer E4, infer E5],
        [infer A1, infer A2, infer A3, infer A4, infer A5]
     ]
   ? [
        H.Kind2<URI, TC, E1, A1>,
        H.Kind2<URI, TC, E2, A2>,
        H.Kind2<URI, TC, E3, A3>,
        H.Kind2<URI, TC, E4, A4>,
        H.Kind2<URI, TC, E5, A5>
     ]
   : H.Kind2<URI, TC, UnionToIntersection<E[number]>, UnionToIntersection<A[number]>>[];

export type IntersectionKind3<
   R extends unknown[],
   E extends unknown[],
   A extends unknown[],
   URI extends H.URIS3,
   TC = H.Auto
> = [R, E, A] extends [[infer R1, infer R2], [infer E1, infer E2], [infer A1, infer A2]]
   ? [H.Kind3<URI, TC, R1, E1, A1>, H.Kind3<URI, TC, R2, E2, A2>]
   : [R, E, A] extends [[infer R1, infer R2, infer R3], [infer E1, infer E2, infer E3], [infer A1, infer A2, infer A3]]
   ? [H.Kind3<URI, TC, R1, E1, A1>, H.Kind3<URI, TC, R2, E2, A2>, H.Kind3<URI, TC, R3, E3, A3>]
   : [R, E, A] extends [
        [infer R1, infer R2, infer R3, infer R4],
        [infer E1, infer E2, infer E3, infer E4],
        [infer A1, infer A2, infer A3, infer A4]
     ]
   ? [
        H.Kind3<URI, TC, R1, E1, A1>,
        H.Kind3<URI, TC, R2, E2, A2>,
        H.Kind3<URI, TC, R3, E3, A3>,
        H.Kind3<URI, TC, R4, E4, A4>
     ]
   : [R, E, A] extends [
        [infer R1, infer R2, infer R3, infer R4, infer R5],
        [infer E1, infer E2, infer E3, infer E4, infer E5],
        [infer A1, infer A2, infer A3, infer A4, infer A5]
     ]
   ? [
        H.Kind3<URI, TC, R1, E1, A1>,
        H.Kind3<URI, TC, R2, E2, A2>,
        H.Kind3<URI, TC, R3, E3, A3>,
        H.Kind3<URI, TC, R4, E4, A4>,
        H.Kind3<URI, TC, R5, E5, A5>
     ]
   : H.Kind3<URI, TC, UnionToIntersection<R[number]>, UnionToIntersection<E[number]>, UnionToIntersection<A[number]>>[];

export type Intersection4<
   S extends unknown[],
   R extends unknown[],
   E extends unknown[],
   A extends unknown[],
   URI extends H.URIS4,
   TC = H.Auto
> = [S, R, E, A] extends [[infer S1, infer S2], [infer R1, infer R2], [infer E1, infer E2], [infer A1, infer A2]]
   ? [H.Kind4<URI, TC, S1, R1, E1, A1>, H.Kind4<URI, TC, S2, R2, E2, A2>]
   : [S, R, E, A] extends [
        [infer S1, infer S2, infer S3],
        [infer R1, infer R2, infer R3],
        [infer E1, infer E2, infer E3],
        [infer A1, infer A2, infer A3]
     ]
   ? [H.Kind4<URI, TC, S1, R1, E1, A1>, H.Kind4<URI, TC, S2, R2, E2, A2>, H.Kind4<URI, TC, S3, R3, E3, A3>]
   : [S, R, E, A] extends [
        [infer S1, infer S2, infer S3, infer S4],
        [infer R1, infer R2, infer R3, infer R4],
        [infer E1, infer E2, infer E3, infer E4],
        [infer A1, infer A2, infer A3, infer A4]
     ]
   ? [
        H.Kind4<URI, TC, S1, R1, E1, A1>,
        H.Kind4<URI, TC, S2, R2, E2, A2>,
        H.Kind4<URI, TC, S3, R3, E3, A3>,
        H.Kind4<URI, TC, S4, R4, E4, A4>
     ]
   : [S, R, E, A] extends [
        [infer S1, infer S2, infer S3, infer S4, infer S5],
        [infer R1, infer R2, infer R3, infer R4, infer R5],
        [infer E1, infer E2, infer E3, infer E4, infer E5],
        [infer A1, infer A2, infer A3, infer A4, infer A5]
     ]
   ? [
        H.Kind4<URI, TC, S1, R1, E1, A1>,
        H.Kind4<URI, TC, S2, R2, E2, A2>,
        H.Kind4<URI, TC, S3, R3, E3, A3>,
        H.Kind4<URI, TC, S4, R4, E4, A4>,
        H.Kind4<URI, TC, S5, R5, E5, A5>
     ]
   : H.Kind4<
        URI,
        TC,
        UnionToIntersection<S[number]>,
        UnionToIntersection<R[number]>,
        UnionToIntersection<E[number]>,
        UnionToIntersection<A[number]>
     >[];

export type Interface1<Props, URI extends H.URIS1, TC = H.Auto> = {
   [k in keyof Props]: Props[k] extends InterpretedHKT<infer U, infer Env, infer S, infer R, infer E, infer A>
      ? H.Kind1<URI, TC, A>
      : never;
};

export type Interface2<Props, URI extends H.URIS2, TC = H.Auto> = {
   [k in keyof Props]: Props[k] extends InterpretedHKT<infer U, infer Env, infer S, infer R, infer E, infer A>
      ? H.Kind2<URI, TC, E, A>
      : never;
};

export type Interface3<Props, URI extends H.URIS3, TC = H.Auto> = {
   [k in keyof Props]: Props[k] extends InterpretedHKT<infer U, infer Env, infer S, infer R, infer E, infer A>
      ? H.Kind3<URI, TC, R, E, A>
      : never;
};

export type Interface4<Props, URI extends H.URIS4, TC = H.Auto> = {
   [k in keyof Props]: Props[k] extends InterpretedHKT<infer U, infer Env, infer S, infer R, infer E, infer A>
      ? H.Kind4<URI, TC, S, R, E, A>
      : never;
};
