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
export interface TupleConfig<Types extends ReadonlyArray<InterpretedKind<any, any, any, any>>> {}

export interface UUIDBrand {
  readonly UUID: unique symbol
}

export type UUID = Branded<string, UUIDBrand>

export interface PrimitivesAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly string: (
    config?: Config<Env, string, string, StringConfig>
  ) => InterpretedKind<F, Env, string, string>

  readonly literal: <T extends readonly [Literal, ...Literal[]]>(
    ...values: T
  ) => (
    config?: Config<Env, Literal, T[number], LiteralConfig<T>>
  ) => InterpretedKind<F, Env, Literal, T[number]>

  readonly stringLiteral: <T extends string>(
    value: T,
    config?: Config<Env, string, T, StringLiteralConfig<T>>
  ) => InterpretedKind<F, Env, string, T>

  readonly numberLiteral: <T extends number>(
    value: T,
    config?: Config<Env, number, T, NumberLiteralConfig<T>>
  ) => InterpretedKind<F, Env, number, T>

  readonly number: (
    config?: Config<Env, number, number, NumberConfig>
  ) => InterpretedKind<F, Env, number, number>

  readonly boolean: (
    config?: Config<Env, boolean, boolean, BooleanConfig>
  ) => InterpretedKind<F, Env, boolean, boolean>

  readonly bigint: (
    config?: Config<Env, string, bigint, BigIntConfig>
  ) => InterpretedKind<F, Env, string, bigint>

  readonly date: (
    config?: Config<Env, string, Date, DateConfig>
  ) => InterpretedKind<F, Env, string, Date>

  readonly array: <E, A>(
    items: InterpretedKind<F, Env, E, A>,
    config?: Config<Env, ReadonlyArray<E>, ReadonlyArray<A>, ArrayConfig<E, A>>
  ) => InterpretedKind<F, Env, ReadonlyArray<E>, ReadonlyArray<A>>

  readonly nonEmptyArray: <E, A>(
    items: InterpretedKind<F, Env, E, A>,
    config?: Config<Env, ReadonlyArray<E>, NonEmptyArray<A>, NonEmptyArrayConfig<E, A>>
  ) => InterpretedKind<F, Env, ReadonlyArray<E>, NonEmptyArray<A>>

  readonly tuple: <
    Types extends readonly [
      InterpretedKind<F, Env, unknown, unknown>,
      ...ReadonlyArray<InterpretedKind<F, Env, unknown, unknown>>
    ]
  >(
    ...types: Types
  ) => (
    config?: Config<Env, _E<F, Env, Types>, _A<F, Env, Types>, TupleConfig<Types>>
  ) => InterpretedKind<F, Env, _E<F, Env, Types>, _A<F, Env, Types>>

  readonly keyof: <K extends Keys>(
    keys: K,
    config?: Config<Env, string, keyof K & string, KeyofConfig<K>>
  ) => InterpretedKind<F, Env, string, keyof K & string>

  readonly UUID: (
    config?: Config<Env, string, UUID, UUIDConfig>
  ) => InterpretedKind<F, Env, string, UUID>
}

type _E<F extends InterpreterURIS, Env extends AnyEnv, Ts extends ReadonlyArray<any>> = {
  readonly [K in keyof Ts]: [Ts[K]] extends [InterpretedKind<F, Env, infer E, unknown>] ? E : never
}

type _A<F extends InterpreterURIS, Env extends AnyEnv, Ts extends ReadonlyArray<any>> = {
  readonly [K in keyof Ts]: [Ts[K]] extends [InterpretedKind<F, Env, unknown, infer A>] ? A : never
}
