import type { AnyEnv, Config, ErrorOf, InputOf, InterpretedKind, InterpreterURIS, OutputOf, TypeOf } from '../HKT'
import type { UUIDE } from '../interpreter/Decoder/primitives'
import type { Branded } from '@principia/base/Brand'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Primitive } from '@principia/base/util/types'
import type {
  BigIntE,
  BooleanE,
  DateFromStringE,
  KeyOfE,
  LiteralE,
  NonExistentZeroIndexE,
  NumberE,
  StringE
} from '@principia/codec/DecodeError'

export const PrimitivesURI = 'model/algebra/primitives'

export type PrimitivesURI = typeof PrimitivesURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [PrimitivesURI]: PrimitivesAlgebra<IURI, Env>
  }
}

type Keys = Record<string, any>

export interface StringConfig {}
export interface NumberConfig {}
export interface BooleanConfig {}
export interface BigIntConfig {}
export interface ArrayConfig<I, E, A, O> {}
export interface NonEmptyArrayConfig<I, E, A, O> {}
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
    config?: Config<Env, unknown, StringE, string, string, StringConfig>
  ) => InterpretedKind<F, Env, unknown, StringE, string, string>

  readonly literal: <T extends readonly [Primitive, ...Primitive[]]>(
    ...values: T
  ) => (
    config?: Config<Env, unknown, LiteralE<T>, T[number], Primitive, LiteralConfig<T>>
  ) => InterpretedKind<F, Env, unknown, LiteralE<T>, T[number], Primitive>

  readonly stringLiteral: <T extends string>(
    value: T,
    config?: Config<Env, unknown, LiteralE<[T]>, T, string, StringLiteralConfig<T>>
  ) => InterpretedKind<F, Env, unknown, LiteralE<[T]>, T, string>

  readonly numberLiteral: <T extends number>(
    value: T,
    config?: Config<Env, unknown, LiteralE<[T]>, T, number, NumberLiteralConfig<T>>
  ) => InterpretedKind<F, Env, unknown, LiteralE<[T]>, T, number>

  readonly number: (
    config?: Config<Env, unknown, NumberE, number, number, NumberConfig>
  ) => InterpretedKind<F, Env, unknown, NumberE, number, number>

  readonly boolean: (
    config?: Config<Env, unknown, BooleanE, boolean, boolean, BooleanConfig>
  ) => InterpretedKind<F, Env, unknown, BooleanE, boolean, boolean>

  readonly bigint: (
    config?: Config<Env, unknown, StringE | BigIntE, bigint, string, BigIntConfig>
  ) => InterpretedKind<F, Env, unknown, StringE | BigIntE, bigint, string>

  readonly date: (
    config?: Config<Env, unknown, StringE | DateFromStringE, Date, string, DateConfig>
  ) => InterpretedKind<F, Env, unknown, StringE | DateFromStringE, Date, string>

  readonly array: <Item extends InterpretedKind<F, Env, any, any, any, any>>(
    item: Item,
    config?: Config<
      Env,
      Array<InputOf<F, Env, Item>>,
      ErrorOf<F, Env, Item>,
      ReadonlyArray<TypeOf<F, Env, Item>>,
      ReadonlyArray<OutputOf<F, Env, Item>>,
      ArrayConfig<InputOf<F, Env, Item>, ErrorOf<F, Env, Item>, TypeOf<F, Env, Item>, OutputOf<F, Env, Item>>
    >
  ) => InterpretedKind<
    F,
    Env,
    Array<InputOf<F, Env, Item>>,
    ErrorOf<F, Env, Item>,
    ReadonlyArray<TypeOf<F, Env, Item>>,
    ReadonlyArray<OutputOf<F, Env, Item>>
  >

  readonly nonEmptyArray: <Item extends InterpretedKind<F, Env, any, any, any, any>>(
    item: Item,
    config?: Config<
      Env,
      Array<InputOf<F, Env, Item>>,
      ErrorOf<F, Env, Item> | NonExistentZeroIndexE,
      NonEmptyArray<TypeOf<F, Env, Item>>,
      ReadonlyArray<OutputOf<F, Env, Item>>,
      NonEmptyArrayConfig<InputOf<F, Env, Item>, ErrorOf<F, Env, Item>, TypeOf<F, Env, Item>, OutputOf<F, Env, Item>>
    >
  ) => InterpretedKind<
    F,
    Env,
    Array<InputOf<F, Env, Item>>,
    ErrorOf<F, Env, Item> | NonExistentZeroIndexE,
    NonEmptyArray<TypeOf<F, Env, Item>>,
    ReadonlyArray<OutputOf<F, Env, Item>>
  >

  readonly tuple: <
    Types extends readonly [
      InterpretedKind<F, Env, any, any, any, any>,
      ...ReadonlyArray<InterpretedKind<F, Env, any, any, any, any>>
    ]
  >(
    ...types: Types
  ) => (
    config?: Config<Env, unknown, _E<F, Env, Types>, _A<F, Env, Types>, _O<F, Env, Types>, TupleConfig<Types>>
  ) => InterpretedKind<F, Env, unknown, _E<F, Env, Types>, _A<F, Env, Types>, _O<F, Env, Types>>

  readonly keyof: <K extends Keys>(
    keys: K,
    config?: Config<Env, unknown, StringE | KeyOfE<keyof K & string>, string & keyof K, string, KeyofConfig<K>>
  ) => InterpretedKind<F, Env, unknown, StringE | KeyOfE<keyof K & string>, string & keyof K, string>

  readonly UUID: (
    config?: Config<Env, unknown, StringE | UUIDE, UUID, string, UUIDConfig>
  ) => InterpretedKind<F, Env, unknown, StringE | UUIDE, UUID, string>
}

type _I<F extends InterpreterURIS, Env extends AnyEnv, Ts extends ReadonlyArray<any>> = {
  readonly [K in keyof Ts]: InputOf<F, Env, Ts[K]>
}

type _E<F extends InterpreterURIS, Env extends AnyEnv, Ts extends ReadonlyArray<any>> = {
  readonly [K in keyof Ts]: ErrorOf<F, Env, Ts[K]>
}[number]

type _A<F extends InterpreterURIS, Env extends AnyEnv, Ts extends ReadonlyArray<any>> = {
  readonly [K in keyof Ts]: TypeOf<F, Env, Ts[K]>
}

type _O<F extends InterpreterURIS, Env extends AnyEnv, Ts extends ReadonlyArray<any>> = {
  readonly [K in keyof Ts]: OutputOf<F, Env, Ts[K]>
}
