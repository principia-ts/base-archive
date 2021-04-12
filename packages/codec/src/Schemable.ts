import type * as DE from './DecodeError'
import type * as D from './Decoder'
import type { HKT4 } from '@principia/base/HKT'

export interface HKT5<URI, I, S, R, E, A> extends HKT4<URI, S, R, E, A> {
  readonly _I: I
}

export interface AnyHKT5 extends HKT5<any, any, any, any, any, any> {}

export type DecoderOfHKT5<K> = K extends HKT5<any, infer D, any, any, any, any> ? D : never
export type InputOfHKT4<K> = K extends HKT5<any, any, infer I, any, any, any> ? I : never
export type ErrorOfHKT4<K> = K extends HKT5<any, any, any, infer E, any, any> ? E : never
export type TypeOfHKT4<K> = K extends HKT5<any, any, any, any, infer A, any> ? A : never
export type OutputOfHKT4<K> = K extends HKT5<any, any, any, any, any, infer O> ? O : never

export interface Schemable<S> {
  readonly URI: S
  readonly string: HKT5<S, D.stringUD, unknown, DE.LeafE<DE.StringE>, string, string>
  readonly number: HKT5<S, D.numberUD, unknown, DE.LeafE<DE.NumberE>, number, number>
  readonly boolean: HKT5<S, D.booleanUD, unknown, DE.LeafE<DE.BooleanE>, boolean, boolean>
  readonly nullable: <Or extends AnyHKT5>(
    or: Or
  ) => HKT5<
    S,
    D.NullableD<DecoderOfHKT5<Or>>,
    null | undefined | InputOfHKT4<Or>,
    DE.NullableE<ErrorOfHKT4<Or>>,
    null | TypeOfHKT4<Or>,
    null | OutputOfHKT4<Or>
  >
}

interface SchemableDecoder {
  readonly string: D.stringUD
  readonly number: D.numberUD
  readonly boolean: D.booleanUD
  readonly nullable: <Or extends D.AnyD>(or: Or) => D.NullableD<Or>
}



export interface Schema<D, I, E, A, O> {
  <S>(S: Schemable<S>): HKT5<S, D, I, E, A, O>
}

export interface AnySchema extends Schema<any, any, any, any, any> {}

export type DecoderOfSchema<S> = S extends Schema<infer D, any, any, any, any> ? D : never
export type InputOfSchema<S> = S extends Schema<any, infer I, any, any, any> ? I : never
export type ErrorOfSchema<S> = S extends Schema<any, any, infer E, any, any> ? E : never
export type TypeOfSchema<S> = S extends Schema<any, any, any, infer A, any> ? A : never
export type OutputOfSchema<S> = S extends Schema<any, any, any, any, infer O> ? O : never

declare const make: <D, I, E, A, O>(schema: Schema<D, I, E, A, O>) => Schema<D, I, E, A, O>

const x = make((S) => S.nullable(S.boolean))

declare function decoderInterpreter<S>(S: SchemableDecoder): <D, I, E, A, O>(schema: Schema<D, I, E, A, O>) => D

const interpret = decoderInterpreter({} as SchemableDecoder)

const y = interpret(x)