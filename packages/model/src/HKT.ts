import type { UnionToIntersection } from "@principia/prelude/Utils";

import type { TaggedBuilder } from "./adt/summoner";
import { makeTagged } from "./adt/summoner";
import { OpticsFor } from "./optics";
import type { CacheType, InhabitedTypes, SelectKeyOfMatchingValues } from "./utils";
import { assignCallable, assignFunction, inhabitTypes, memoize, wrapFun } from "./utils";

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

export type ConfigURIS = keyof URItoConfig<any, any, any, any>;

export type ConfigKind<CURI extends ConfigURIS, S, R, E, A> = CURI extends ConfigURIS
   ? URItoConfig<S, R, E, A>[CURI]
   : never;

export type Config<Env extends AnyEnv, S, R, E, A, Custom = {}> = {
   name?: string;
   id?: string;
   message?: string;
   config?: MapToConfig<Env, URItoConfig<S, R, E, A>, Custom>;
};

export type ThreadURI<C, IURI extends InterpreterURIS> = IURI extends keyof C ? C[IURI] : unknown;

export function getApplyConfig<IURI extends InterpreterURIS>(
   uri: IURI
): <Config>(config?: Config | undefined) => NonNullable<ThreadURI<Config, IURI>> {
   return (config) =>
      ((a: any, r: any, k: any) =>
         ((config && (config as any)[uri] ? (config as any)[uri] : <A>(a: A) => a) as any)(a, r[uri], k)) as any;
}

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

export type Model<PURI extends ProgramURIS, RURI extends ResultURIS, Env extends AnyEnv, S, R, E, A> = URItoResult<
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
): Model<PURI, RURI, Env, S, R, E, A> & InhabitedTypes<Env, S, R, E, A> {
   return inhabitInterpreterAndAlgebra(
      inhabitTypes(assignFunction(wrapFun(program as any), programInterpreter(program)))
   );
}

export function materialize<PURI extends ProgramURIS, IURI extends InterpreterURIS, Env extends AnyEnv, S, R, E, A>(
   program: URItoProgram<Env, S, R, E, A>[PURI],
   programInterpreter: ProgramInterpreter<PURI, IURI>
): Model<PURI, IURI, Env, S, R, E, A> {
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
   <S, R, E, A>(F: InferredProgram<PURI, Env, S, R, E, A>): Model<PURI, RURI, Env, S, R, E, A>;
   readonly _P: PURI;
   readonly _M: RURI;
   readonly _Env: (_: Env) => void;
}

export type SummonerPURI<X extends Summoners<any, any, any>> = NonNullable<X["_P"]>;

export type SummonerRURI<X extends Summoners<any, any, any>> = NonNullable<X["_M"]>;

export type SummonerEnv<X extends Summoners<any, any, any>> = NonNullable<Parameters<X["_Env"]>[0]>;

export interface SummonerOps<S extends Summoners<any, any, any> = never> {
   readonly make: S;
   readonly makeADT: TaggedBuilder<SummonerPURI<S>, SummonerRURI<S>, SummonerEnv<S>>;
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
   type M<S, R, E, A> = Model<PURI, IURI, Env, S, R, E, A>;

   const summon = (<S, R, E, A>(F: P<S, R, E, A>): M<S, R, E, A> =>
      materialize(
         cacheProgramEval(F),
         programInterpreter as <S, R, E, A>(program: P<S, R, E, A>) => URItoResult<S, R, E, A>[IURI]
      )) as Su;
   const tagged: TaggedBuilder<PURI, IURI, SummonerEnv<Su>> = makeTagged(summon);
   return {
      make: summon,
      makeADT: tagged
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

export type IntersectionConfigKind<
   CURI extends ConfigURIS,
   S extends readonly unknown[],
   R extends readonly unknown[],
   E extends readonly unknown[],
   A extends readonly unknown[]
> = {
   [k in keyof A]: k extends keyof S
      ? k extends keyof R
         ? k extends keyof E
            ? ConfigKind<CURI, S[k], R[k], E[k], A[k]>
            : never
         : never
      : never;
};

export type TaggedUnionConfigKind<CURI extends ConfigURIS, Types> = {
   [k in keyof Types]: Types[k] extends InterpretedHKT<infer U, infer Env, infer S, infer R, infer E, infer A>
      ? ConfigKind<CURI, S, R, E, A>
      : Types[k] extends Model<infer PU, infer RU, infer Env, infer S, infer R, infer E, infer A>
      ? ConfigKind<CURI, S, R, E, A>
      : Types[k] extends [infer S, infer R, infer E, infer A]
      ? ConfigKind<CURI, S, R, E, A>
      : never;
};

export type InterfaceConfigKind<CURI extends ConfigURIS, Props> = {
   [k in keyof Props]: Props[k] extends InterpretedHKT<infer U, infer Env, infer S, infer R, infer E, infer A>
      ? ConfigKind<CURI, S, R, E, A>
      : never;
};
