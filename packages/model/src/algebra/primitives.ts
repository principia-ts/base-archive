import type { AnyEnv, Config, ErrorOf, InputOf, InterpretedKind, InterpreterURIS, OutputOf, TypeOf } from '../HKT'
import type { Branded } from '@principia/base/Brand'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Primitive } from '@principia/base/util/types'
import type * as DE from '@principia/codec/DecodeError'
import type { CastToNumber } from '@principia/codec/util'

export const PrimitivesURI = 'model/algebra/primitives'

export type PrimitivesURI = typeof PrimitivesURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [PrimitivesURI]: PrimitivesAlgebra<IURI, Env>
  }
}

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

export interface UUIDE extends DE.ActualE<string> {
  readonly _tag: 'UUIDE'
}

export type UUID = Branded<string, UUIDBrand>

export interface PrimitivesAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly string: (
    config?: Config<Env, unknown, DE.StringLE, string, string, StringConfig>
  ) => InterpretedKind<F, Env, unknown, DE.StringLE, string, string>

  readonly literal: <T extends readonly [Primitive, ...Primitive[]]>(
    ...values: T
  ) => (
    config?: Config<Env, unknown, DE.LeafE<DE.LiteralE<T[number]>>, T[number], Primitive, LiteralConfig<T>>
  ) => InterpretedKind<F, Env, unknown, DE.LeafE<DE.LiteralE<T[number]>>, T[number], Primitive>

  readonly stringLiteral: <T extends string>(
    value: T,
    config?: Config<Env, unknown, DE.LeafE<DE.LiteralE<T>>, T, string, StringLiteralConfig<T>>
  ) => InterpretedKind<F, Env, unknown, DE.LeafE<DE.LiteralE<T>>, T, string>

  readonly numberLiteral: <T extends number>(
    value: T,
    config?: Config<Env, unknown, DE.LeafE<DE.LiteralE<T>>, T, number, NumberLiteralConfig<T>>
  ) => InterpretedKind<F, Env, unknown, DE.LeafE<DE.LiteralE<T>>, T, number>

  readonly number: (
    config?: Config<Env, unknown, DE.NumberLE | DE.InfinityLE | DE.NaNLE, number, number, NumberConfig>
  ) => InterpretedKind<F, Env, unknown, DE.NumberLE | DE.InfinityLE | DE.NaNLE, number, number>

  readonly boolean: (
    config?: Config<Env, unknown, DE.BooleanLE, boolean, boolean, BooleanConfig>
  ) => InterpretedKind<F, Env, unknown, DE.BooleanLE, boolean, boolean>

  readonly bigint: (
    config?: Config<Env, unknown, DE.StringLE | DE.BigIntLE, bigint, string, BigIntConfig>
  ) => InterpretedKind<F, Env, unknown, DE.StringLE | DE.BigIntLE, bigint, string>

  readonly date: (
    config?: Config<
      Env,
      unknown,
      DE.CompositionE<DE.StringLE | DE.ParserE<DE.DateFromStringLE>>,
      Date,
      string,
      DateConfig
    >
  ) => InterpretedKind<F, Env, unknown, DE.CompositionE<DE.StringLE | DE.ParserE<DE.DateFromStringLE>>, Date, string>

  readonly array: <Item extends InterpretedKind<F, Env, any, any, any, any>>(
    item: Item,
    config?: Config<
      Env,
      Array<InputOf<F, Env, Item>>,
      DE.ArrayE<DE.OptionalIndexE<number, ErrorOf<F, Env, Item>>>,
      ReadonlyArray<TypeOf<F, Env, Item>>,
      ReadonlyArray<OutputOf<F, Env, Item>>,
      ArrayConfig<InputOf<F, Env, Item>, ErrorOf<F, Env, Item>, TypeOf<F, Env, Item>, OutputOf<F, Env, Item>>
    >
  ) => InterpretedKind<
    F,
    Env,
    Array<InputOf<F, Env, Item>>,
    DE.ArrayE<DE.OptionalIndexE<number, ErrorOf<F, Env, Item>>>,
    ReadonlyArray<TypeOf<F, Env, Item>>,
    ReadonlyArray<OutputOf<F, Env, Item>>
  >

  readonly nonEmptyArray: <Item extends InterpretedKind<F, Env, any, any, any, any>>(
    item: Item,
    config?: Config<
      Env,
      Array<InputOf<F, Env, Item>>,
      DE.ArrayE<DE.OptionalIndexE<number, ErrorOf<F, Env, Item>>> | DE.EmptyLE,
      NonEmptyArray<TypeOf<F, Env, Item>>,
      ReadonlyArray<OutputOf<F, Env, Item>>,
      NonEmptyArrayConfig<InputOf<F, Env, Item>, ErrorOf<F, Env, Item>, TypeOf<F, Env, Item>, OutputOf<F, Env, Item>>
    >
  ) => InterpretedKind<
    F,
    Env,
    Array<InputOf<F, Env, Item>>,
    DE.ArrayE<DE.OptionalIndexE<number, ErrorOf<F, Env, Item>>> | DE.EmptyLE,
    NonEmptyArray<TypeOf<F, Env, Item>>,
    ReadonlyArray<OutputOf<F, Env, Item>>
  >

  readonly tuple: <
    C extends readonly [
      InterpretedKind<F, Env, any, any, any, any>,
      ...ReadonlyArray<InterpretedKind<F, Env, any, any, any, any>>
    ]
  >(
    ...components: C
  ) => (
    config?: Config<
      Env,
      unknown,
      | DE.LeafE<DE.UnknownArrayE>
      | DE.TupleE<{ readonly [K in keyof C]: DE.RequiredIndexE<CastToNumber<K>, ErrorOf<F, Env, C[K]>> }[number]>,
      _A<F, Env, C>,
      _O<F, Env, C>,
      TupleConfig<C>
    >
  ) => InterpretedKind<
    F,
    Env,
    unknown,
    | DE.LeafE<DE.UnknownArrayE>
    | DE.TupleE<{ readonly [K in keyof C]: DE.RequiredIndexE<CastToNumber<K>, ErrorOf<F, Env, C[K]>> }[number]>,
    _A<F, Env, C>,
    _O<F, Env, C>
  >

  readonly UUID: (
    config?: Config<
      Env,
      unknown,
      DE.CompositionE<DE.StringLE | DE.RefinementE<DE.LeafE<UUIDE>>>,
      UUID,
      string,
      UUIDConfig
    >
  ) => InterpretedKind<F, Env, unknown, DE.CompositionE<DE.StringLE | DE.RefinementE<DE.LeafE<UUIDE>>>, UUID, string>
}

type _A<F extends InterpreterURIS, Env extends AnyEnv, Ts extends ReadonlyArray<any>> = {
  readonly [K in keyof Ts]: TypeOf<F, Env, Ts[K]>
}

type _O<F extends InterpreterURIS, Env extends AnyEnv, Ts extends ReadonlyArray<any>> = {
  readonly [K in keyof Ts]: OutputOf<F, Env, Ts[K]>
}
