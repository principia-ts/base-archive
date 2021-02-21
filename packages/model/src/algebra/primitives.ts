import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'
import type { Literal } from '../utils'
import type { Branded } from '@principia/base/Brand'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'

export const PrimitivesURI = 'model/algebra/primitives'

export type PrimitivesURI = typeof PrimitivesURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [PrimitivesURI]: PrimitivesAlgebra<IURI, Env>
  }
}

type Keys = Record<string, null>

export interface StringConfig {}
export interface NumberConfig {}
export interface BooleanConfig {}
export interface BigIntConfig {}
export interface ArrayConfig<E, A> {}
export interface NonEmptyArrayConfig<E, A> {}
export interface KeyofConfig<K> {}
export interface StringLiteralConfig<T> {}
export interface NumberLiteralConfig<T> {}
export interface LiteralConfig<T> {}
export interface DateConfig {}
export interface UUIDConfig {}
export interface TupleConfig<Types extends ReadonlyArray<InterpretedKind<any, any, any, any, any, any>>> {}

export interface UUIDBrand {
  readonly UUID: unique symbol
}

export type UUID = Branded<string, UUIDBrand>

export interface PrimitivesAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly string: (
    config?: Config<Env, unknown, unknown, string, string, StringConfig>
  ) => InterpretedKind<F, Env, unknown, unknown, string, string>

  readonly literal: <T extends readonly [Literal, ...Literal[]]>(
    ...values: T
  ) => (
    config?: Config<Env, unknown, unknown, Literal, T[number], LiteralConfig<T>>
  ) => InterpretedKind<F, Env, unknown, unknown, Literal, T[number]>

  readonly stringLiteral: <T extends string>(
    value: T,
    config?: Config<Env, unknown, unknown, string, T, StringLiteralConfig<T>>
  ) => InterpretedKind<F, Env, unknown, unknown, string, T>

  readonly numberLiteral: <T extends number>(
    value: T,
    config?: Config<Env, unknown, unknown, number, T, NumberLiteralConfig<T>>
  ) => InterpretedKind<F, Env, unknown, unknown, number, T>

  readonly number: (
    config?: Config<Env, unknown, unknown, number, number, NumberConfig>
  ) => InterpretedKind<F, Env, unknown, unknown, number, number>

  readonly boolean: (
    config?: Config<Env, unknown, unknown, boolean, boolean, BooleanConfig>
  ) => InterpretedKind<F, Env, unknown, unknown, boolean, boolean>

  readonly bigint: (
    config?: Config<Env, unknown, unknown, string, bigint, BigIntConfig>
  ) => InterpretedKind<F, Env, unknown, unknown, string, bigint>

  readonly date: (
    config?: Config<Env, unknown, unknown, string, Date, DateConfig>
  ) => InterpretedKind<F, Env, unknown, unknown, string, Date>

  readonly array: <S, R, E, A>(
    items: InterpretedKind<F, Env, S, R, E, A>,
    config?: Config<Env, unknown, unknown, ReadonlyArray<E>, ReadonlyArray<A>, ArrayConfig<E, A>>
  ) => InterpretedKind<F, Env, unknown, unknown, ReadonlyArray<E>, ReadonlyArray<A>>

  readonly nonEmptyArray: <S, R, E, A>(
    items: InterpretedKind<F, Env, S, R, E, A>,
    config?: Config<Env, unknown, unknown, ReadonlyArray<E>, NonEmptyArray<A>, NonEmptyArrayConfig<E, A>>
  ) => InterpretedKind<F, Env, unknown, unknown, ReadonlyArray<E>, NonEmptyArray<A>>

  readonly tuple: <
    Types extends readonly [
      InterpretedKind<F, Env, unknown, unknown, unknown, unknown>,
      ...ReadonlyArray<InterpretedKind<F, Env, unknown, unknown, unknown, unknown>>
    ]
  >(
    ...types: Types
  ) => (
    config?: Config<Env, _S<F, Env, Types>, _R<F, Env, Types>, _E<F, Env, Types>, _A<F, Env, Types>, TupleConfig<Types>>
  ) => InterpretedKind<F, Env, _S<F, Env, Types>, _R<F, Env, Types>, _E<F, Env, Types>, _A<F, Env, Types>>

  readonly keyof: <K extends Keys>(
    keys: K,
    config?: Config<Env, unknown, unknown, string, keyof K & string, KeyofConfig<K>>
  ) => InterpretedKind<F, Env, unknown, unknown, string, keyof K & string>

  readonly UUID: (
    config?: Config<Env, unknown, unknown, string, UUID, UUIDConfig>
  ) => InterpretedKind<F, Env, unknown, unknown, string, UUID>
}

type _S<F extends InterpreterURIS, Env extends AnyEnv, Ts extends ReadonlyArray<any>> = {
  readonly [K in keyof Ts]: [Ts[K]] extends [InterpretedKind<F, Env, infer S, unknown, unknown, unknown>] ? S : never
}

type _R<F extends InterpreterURIS, Env extends AnyEnv, Ts extends ReadonlyArray<any>> = {
  readonly [K in keyof Ts]: [Ts[K]] extends [InterpretedKind<F, Env, unknown, infer R, unknown, unknown>] ? R : never
}

type _E<F extends InterpreterURIS, Env extends AnyEnv, Ts extends ReadonlyArray<any>> = {
  readonly [K in keyof Ts]: [Ts[K]] extends [InterpretedKind<F, Env, unknown, unknown, infer E, unknown>] ? E : never
}

type _A<F extends InterpreterURIS, Env extends AnyEnv, Ts extends ReadonlyArray<any>> = {
  readonly [K in keyof Ts]: [Ts[K]] extends [InterpretedKind<F, Env, unknown, unknown, unknown, infer A>] ? A : never
}
