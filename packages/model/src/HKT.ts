import type { Model } from './abstract/Model'
import type { SelectKeyOfMatchingValues } from './utils'
import type * as HKT from '@principia/base/HKT'
import type { UnionToIntersection } from '@principia/base/util/types'

import { memoize } from './utils'

/*
 * -------------------------------------------
 * Interpreter
 * -------------------------------------------
 */

export interface InterpretedHKT<URI, Env, E, A> {
  readonly _URI: URI
  readonly _Env: (_: Env) => void
  readonly _E: E
  readonly _A: A
}

export type ExtractURI<U> = U extends HKT.URI<infer F, any> ? F : never

export const UIHKT = 'model/HKT'

export type UIHKT = typeof UIHKT

export interface URItoInterpreted<Env, E, A> {
  readonly _Env: Env
  readonly _E: E
  readonly _A: A
  readonly [UIHKT]: InterpretedHKT<UIHKT, Env, E, A>
}

export type InterpreterURIS = Exclude<keyof URItoInterpreted<any, any, any>, '_Env' | '_E' | '_A'>

export type Param = 'E' | 'A'

export type InterpretedKind<URI extends InterpreterURIS, Env extends AnyEnv, E, A> = URI extends InterpreterURIS
  ? URItoInterpreted<Env, E, A>[URI]
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

export interface URItoConfig<E, A> {
  readonly [UIHKT]: never
}

export type ConfigURIS = keyof URItoConfig<any, any>

export type ConfigKind<CURI extends ConfigURIS, E, A> = CURI extends ConfigURIS ? URItoConfig<E, A>[CURI] : never

export type Config<Env extends AnyEnv, E, A, Custom = {}> = {
  name?: string
  id?: string
  message?: string
  config?: MapToConfig<Env, URItoConfig<E, A>, Custom>
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

export interface URItoProgram<Env extends AnyEnv, E, A> {}

export type ProgramURIS = keyof URItoProgram<any, any, any>

export interface URItoProgramAlgebra<Env extends AnyEnv> {}

export interface URItoAURIS {}

/*
 * -------------------------------------------
 * Result
 * -------------------------------------------
 */

export interface URItoResult<E, A> extends Record<string, { build: (x: A) => A }> {}

export type ResultURIS = keyof URItoResult<any, any>

export type SelectResultURIS<E, A, ShapeConstraint> = SelectKeyOfMatchingValues<URItoResult<E, A>, ShapeConstraint>

/*
 * -------------------------------------------
 * Configs
 * -------------------------------------------
 */

export type IntersectionConfigKind<
  CURI extends ConfigURIS,
  E extends readonly unknown[],
  A extends readonly unknown[]
> = {
  [k in keyof A]: k extends keyof E ? ConfigKind<CURI, E[k], A[k]> : never
}

export type TaggedUnionConfigKind<CURI extends ConfigURIS, Types> = {
  [k in keyof Types]: Types[k] extends InterpretedHKT<infer U, infer Env, infer E, infer A>
    ? ConfigKind<CURI, E, A>
    : Types[k] extends Model<infer PU, infer RU, infer Env, infer E, infer A>
    ? ConfigKind<CURI, E, A>
    : Types[k] extends [infer E, infer A]
    ? ConfigKind<CURI, E, A>
    : never
}

export type InterfaceConfigKind<CURI extends ConfigURIS, Props> = {
  [k in keyof Props]: Props[k] extends InterpretedHKT<infer U, infer Env, infer E, infer A>
    ? ConfigKind<CURI, E, A>
    : never
}
