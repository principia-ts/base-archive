import type { Model } from './abstract/Model'
import type { SelectKeyOfMatchingValues } from './utils'
import type * as HKT from '@principia/base/HKT'
import type { Primitive, UnionToIntersection } from '@principia/base/util/types'
import type { LiteralE, StringE } from '@principia/codec/DecodeError'

import { memoize } from './utils'

/*
 * -------------------------------------------
 * Interpreter
 * -------------------------------------------
 */

export interface URItoKinds {
  String: any
  Number: any
  Boolean: any
  Literal: any
  Array: any
  NonEmptyArray: any
  Tuple: any
  Struct: any
  Partial: any
  KeyOf: any
  Generic: any
}

export type Kinds = keyof URItoKinds

export interface InterpretedHKT<URI, Env, I, E, A, O> {
  readonly _URI: URI
  readonly _Env: (_: Env) => void
  readonly _I: (_: I) => void
  readonly _E: () => E
  readonly _A: () => A
  readonly _O: () => O
}

export type ExtractURI<U> = U extends HKT.URI<infer F, any> ? F : never

export const UIHKT = 'model/HKT'

export type UIHKT = typeof UIHKT

export interface URItoInterpreted<Env, I, E, A, O> {
  readonly _Env: (_: Env) => void
  readonly _I: (_: I) => void
  readonly _E: () => E
  readonly _A: () => A
  readonly _O: () => O
  readonly [UIHKT]: InterpretedHKT<UIHKT, Env, I, E, A, O>
}

export type InterpreterURIS = Exclude<
  keyof URItoInterpreted<any, any, any, any, any>,
  '_Env' | '_I' | '_E' | '_A' | '_O'
>

export type Param = 'I' | 'E' | 'A' | 'O'

export type InterpretedKind<URI extends InterpreterURIS, Env extends AnyEnv, I, E, A, O> = URI extends InterpreterURIS
  ? URItoInterpreted<Env, I, E, A, O>[URI]
  : never

export type InputOf<URI extends InterpreterURIS, Env extends AnyEnv, K> = K extends InterpretedKind<
  URI,
  Env,
  infer I,
  any,
  any,
  any
>
  ? I
  : never

export type ErrorOf<URI extends InterpreterURIS, Env extends AnyEnv, K> = K extends InterpretedKind<
  URI,
  Env,
  any,
  infer E,
  any,
  any
>
  ? E
  : never

export type TypeOf<URI extends InterpreterURIS, Env extends AnyEnv, K> = K extends InterpretedKind<
  URI,
  Env,
  any,
  any,
  infer A,
  any
>
  ? A
  : never

export type OutputOf<URI extends InterpreterURIS, Env extends AnyEnv, K> = K extends InterpretedKind<
  URI,
  Env,
  any,
  any,
  any,
  infer O
>
  ? O
  : never

export function implementInterpreter<IURI extends InterpreterURIS, AURI extends AlgebraURIS>(): (
  i: <Env extends AnyEnv>(_: { Env: Env }) => Algebra<AURI, IURI, Env>
) => <Env>() => Algebra<AURI, IURI, Env>
export function implementInterpreter() {
  return (i: () => any) => memoize(i)
}

/*
 * -------------------------------------------
 * Algebra
 * -------------------------------------------
 */

export interface URItoAlgebra<IURI extends InterpreterURIS, Env extends AnyEnv> {}

export type AlgebraURIS = keyof URItoAlgebra<any, any>

export type Algebra<AURI extends AlgebraURIS, IURI extends InterpreterURIS, Env extends AnyEnv> = UnionToIntersection<
  URItoAlgebra<IURI, Env>[AURI]
>

/*
 * -------------------------------------------
 * Config
 * -------------------------------------------
 */

export type InterpreterURISIndexedAny = Record<InterpreterURIS, any>

export type AnyEnv = Partial<InterpreterURISIndexedAny>

export type NoEnv = unknown

export type MapToConfig<Env extends AnyEnv, T extends InterpreterURISIndexedAny, Custom> = {
  [IURI in InterpreterURIS]?: (a: T[IURI], env: Env[IURI], k: ThreadURI<Custom, IURI>) => T[IURI]
}

export interface URItoConfig<I, E, A, O> {
  readonly [UIHKT]: never
}

export type ConfigURIS = keyof URItoConfig<any, any, any, any>

export type ConfigKind<CURI extends ConfigURIS, I, E, A, O> = CURI extends ConfigURIS
  ? URItoConfig<I, E, A, O>[CURI]
  : never

export type Config<Env extends AnyEnv, I, E, A, O, Custom = {}> = {
  label?: string
  message?: string
  config?: MapToConfig<Env, URItoConfig<I, E, A, O>, Custom>
}

export type ThreadURI<C, IURI extends InterpreterURIS> = IURI extends keyof C ? C[IURI] : unknown

export function getApplyConfig<IURI extends InterpreterURIS>(
  uri: IURI
): <Config>(config?: Config | undefined) => NonNullable<ThreadURI<Config, IURI>> {
  return (config) =>
    ((a: any, r: any, k: any) =>
      ((config && (config as any)[uri] ? (config as any)[uri] : <A>(a: A) => a) as any)(a, r[uri], k)) as any
}

/*
 * -------------------------------------------
 * Program
 * -------------------------------------------
 */

export interface URItoProgram<Env extends AnyEnv, I, E, A, O> {}

export type ProgramURIS = keyof URItoProgram<any, any, any, any, any>

export interface URItoProgramAlgebra<Env extends AnyEnv> {}

export interface URItoAURIS {}

/*
 * -------------------------------------------
 * Result
 * -------------------------------------------
 */

export interface URItoResult<I, E, A, O> extends Record<string, { build: (x: A) => A }> {}

export type ResultURIS = keyof URItoResult<any, any, any, any>

export type SelectResultURIS<I, E, A, O, ShapeConstraint> = SelectKeyOfMatchingValues<
  URItoResult<I, E, A, O>,
  ShapeConstraint
>

/*
 * -------------------------------------------
 * Configs
 * -------------------------------------------
 */

export type IntersectionConfigKind<
  CURI extends ConfigURIS,
  I extends readonly unknown[],
  E extends readonly unknown[],
  A extends readonly unknown[],
  O extends readonly unknown[]
> = {
  [k in keyof I]: k extends keyof E
    ? k extends keyof A
      ? k extends keyof O
        ? ConfigKind<CURI, I[k], E[k], A[k], O[k]>
        : never
      : never
    : never
}

export type TaggedUnionConfigKind<CURI extends ConfigURIS, Types> = {
  [k in keyof Types]: Types[k] extends InterpretedHKT<infer U, infer Env, infer I, infer E, infer A, infer O>
    ? ConfigKind<CURI, I, E, A, O>
    : Types[k] extends Model<infer PU, infer RU, infer Env, infer I, infer E, infer A, infer O>
    ? ConfigKind<CURI, I, E, A, O>
    : Types[k] extends [infer I, infer E, infer A, infer O]
    ? ConfigKind<CURI, I, E, A, O>
    : never
}

export type InterfaceConfigKind<CURI extends ConfigURIS, Props> = {
  [k in keyof Props]: Props[k] extends InterpretedHKT<infer U, infer Env, infer I, infer E, infer A, infer O>
    ? ConfigKind<CURI, I, E, A, O>
    : never
}
