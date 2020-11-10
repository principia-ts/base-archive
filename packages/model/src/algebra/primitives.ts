import type { NonEmptyArray } from "@principia/core/NonEmptyArray";
import type { Branded } from "@principia/prelude/Branded";

import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from "../HKT";
import type { Literal } from "../utils";

export const PrimitivesURI = "model/algebra/primitives";

export type PrimitivesURI = typeof PrimitivesURI;

declare module "../HKT" {
   interface URItoAlgebra<IURI, Env> {
      readonly [PrimitivesURI]: PrimitivesAlgebra<IURI, Env>;
   }
}

type Keys = Record<string, null>;

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

export interface UUIDBrand {
   readonly UUID: unique symbol;
}

export type UUID = Branded<string, UUIDBrand>;

export interface PrimitivesAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
   readonly string: (
      config?: Config<Env, unknown, unknown, string, string, StringConfig>
   ) => InterpretedKind<F, Env, unknown, unknown, string, string>;

   readonly literal: <T extends readonly [Literal, ...Literal[]]>(
      ...values: T
   ) => (
      config?: Config<Env, unknown, unknown, Literal, T[number], LiteralConfig<T>>
   ) => InterpretedKind<F, Env, unknown, unknown, Literal, T[number]>;

   readonly stringLiteral: <T extends string>(
      value: T,
      config?: Config<Env, unknown, unknown, string, T, StringLiteralConfig<T>>
   ) => InterpretedKind<F, Env, unknown, unknown, string, T>;

   readonly numberLiteral: <T extends number>(
      value: T,
      config?: Config<Env, unknown, unknown, number, T, NumberLiteralConfig<T>>
   ) => InterpretedKind<F, Env, unknown, unknown, number, T>;

   readonly number: (
      config?: Config<Env, unknown, unknown, number, number, NumberConfig>
   ) => InterpretedKind<F, Env, unknown, unknown, number, number>;

   readonly boolean: (
      config?: Config<Env, unknown, unknown, boolean, boolean, BooleanConfig>
   ) => InterpretedKind<F, Env, unknown, unknown, boolean, boolean>;

   readonly bigint: (
      config?: Config<Env, unknown, unknown, string, bigint, BigIntConfig>
   ) => InterpretedKind<F, Env, unknown, unknown, string, bigint>;

   readonly date: (
      config?: Config<Env, unknown, unknown, string, Date, DateConfig>
   ) => InterpretedKind<F, Env, unknown, unknown, string, Date>;

   readonly array: <S, R, E, A>(
      items: InterpretedKind<F, Env, S, R, E, A>,
      config?: Config<Env, unknown, unknown, ReadonlyArray<E>, ReadonlyArray<A>, ArrayConfig<E, A>>
   ) => InterpretedKind<F, Env, unknown, unknown, ReadonlyArray<E>, ReadonlyArray<A>>;

   readonly nonEmptyArray: <S, R, E, A>(
      items: InterpretedKind<F, Env, S, R, E, A>,
      config?: Config<Env, unknown, unknown, ReadonlyArray<E>, NonEmptyArray<A>, NonEmptyArrayConfig<E, A>>
   ) => InterpretedKind<F, Env, unknown, unknown, ReadonlyArray<E>, NonEmptyArray<A>>;

   readonly keyof: <K extends Keys>(
      keys: K,
      config?: Config<Env, unknown, unknown, string, keyof K & string, KeyofConfig<K>>
   ) => InterpretedKind<F, Env, unknown, unknown, string, keyof K & string>;

   readonly UUID: (
      config?: Config<Env, unknown, unknown, string, UUID, UUIDConfig>
   ) => InterpretedKind<F, Env, unknown, unknown, string, UUID>;
}
