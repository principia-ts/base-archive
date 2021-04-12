import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Forest } from '@principia/base/RoseTree'
import type { Primitive } from '@principia/base/util/types'

export type DecodeError<E> =
  | LeafE<E>
  | KeyE<string, DecodeError<E>>
  | IndexE<number, DecodeError<E>>
  | ComponentE<number, DecodeError<E>>
  | MemberE<string | number, DecodeError<E>>
  | RefineE<DecodeError<E>>
  | ParseE<DecodeError<E>>
  | NullableE<DecodeError<E>>
  | OptionalE<DecodeError<E>>
  | StructE<DecodeError<E>>
  | PartialE<DecodeError<E>>
  | TupleE<DecodeError<E>>
  | ArrayE<DecodeError<E>>
  | RecordE<DecodeError<E>>
  | UnionE<DecodeError<E>>
  | IntersectionE<DecodeError<E>>
  | LazyE<DecodeError<E>>
  | SumE<DecodeError<E>>
  | LabeledE<DecodeError<E>>
  | MessageE<DecodeError<E>>

export interface ActualE<I> {
  readonly actual: I
}

export interface SingleE<E> {
  readonly error: E
}

export interface CompoundE<E> {
  readonly errors: NonEmptyArray<E>
}

export interface LeafE<E> extends SingleE<E> {
  readonly _tag: 'LeafE'
}

export function leafE<E>(error: E): LeafE<E> {
  return { _tag: 'LeafE', error }
}

export interface StringE extends ActualE<unknown> {
  readonly _tag: 'StringE'
}
export interface StringLE extends LeafE<StringE> {}

export function stringE(actual: unknown): StringE {
  return { _tag: 'StringE', actual }
}

export interface NumberE extends ActualE<unknown> {
  readonly _tag: 'NumberE'
}
export interface NumberLE extends LeafE<NumberE> {}

export function numberE(actual: unknown): NumberE {
  return { _tag: 'NumberE', actual }
}

export interface BooleanE extends ActualE<unknown> {
  readonly _tag: 'BooleanE'
}
export interface BooleanLE extends LeafE<BooleanE> {}

export function booleanE(actual: unknown): BooleanE {
  return { _tag: 'BooleanE', actual }
}

export interface UnknownArrayE extends ActualE<unknown> {
  readonly _tag: 'UnknownArrayE'
}
export interface UnknownArrayLE extends LeafE<UnknownArrayE> {}

export function unknownArrayE(actual: unknown): UnknownArrayE {
  return { _tag: 'UnknownArrayE', actual }
}

export interface EmptyE extends ActualE<unknown> {
  readonly _tag: 'EmptyE'
}
export interface EmptyLE extends LeafE<EmptyE> {}

export function emptyE(actual: unknown): EmptyE {
  return { _tag: 'EmptyE', actual }
}

export interface UnknownRecordE extends ActualE<unknown> {
  readonly _tag: 'UnknownRecordE'
}
export interface UnknownRecordLE extends LeafE<UnknownRecordE> {}

export function unknownRecordE(actual: unknown): UnknownRecordE {
  return { _tag: 'UnknownRecordE', actual }
}

export interface BigIntE extends ActualE<unknown> {
  readonly _tag: 'BigIntE'
}
export interface BigIntLE extends LeafE<BigIntE> {}

export function bigIntE(actual: unknown): BigIntE {
  return { _tag: 'BigIntE', actual }
}

export interface DateFromStringE extends ActualE<string> {
  readonly _tag: 'DateFromStringE'
}
export interface DateFromStringLE extends LeafE<DateFromStringE> {}

export function dateFromStringE(actual: string): DateFromStringE {
  return { _tag: 'DateFromStringE', actual }
}

export interface LiteralE<A extends Primitive> extends ActualE<unknown> {
  readonly _tag: 'LiteralE'
  readonly literals: NonEmptyArray<A>
}
export interface LiteralLE<A> extends LeafE<LiteralLE<A>> {}

export function literalE<A extends Primitive>(actual: unknown, literals: NonEmptyArray<A>): LiteralE<A> {
  return { _tag: 'LiteralE', literals, actual }
}

export interface NullableE<E> extends SingleE<E> {
  readonly _tag: 'NullableE'
}

export function nullableE<E>(error: E): NullableE<E> {
  return { _tag: 'NullableE', error }
}

export interface OptionalE<E> extends SingleE<E> {
  readonly _tag: 'OptionalE'
}

export function optionalE<E>(error: E): OptionalE<E> {
  return { _tag: 'OptionalE', error }
}

export interface KeyE<K, E> extends SingleE<E> {
  readonly _tag: 'KeyE'
  readonly optional: boolean
  readonly key: K
}

export function keyE<K, E>(key: K, optional: boolean, error: E): KeyE<K, E> {
  return { _tag: 'KeyE', key, optional, error }
}

export interface StructE<E> extends CompoundE<E> {
  readonly _tag: 'StructE'
}

export function structE<E>(errors: NonEmptyArray<E>): StructE<E> {
  return { _tag: 'StructE', errors }
}

export interface PartialE<E> extends CompoundE<E> {
  readonly _tag: 'PartialE'
}

export function partialE<E>(errors: NonEmptyArray<E>): PartialE<E> {
  return { _tag: 'PartialE', errors }
}

export interface ComponentE<I, E> extends SingleE<E> {
  readonly _tag: 'ComponentE'
  readonly index: I
}

export function componentE<I, E>(index: I, error: E): ComponentE<I, E> {
  return { _tag: 'ComponentE', index, error }
}

export interface TupleE<E> extends CompoundE<E> {
  readonly _tag: 'TupleE'
}

export function tupleE<E>(errors: NonEmptyArray<E>): TupleE<E> {
  return { _tag: 'TupleE', errors }
}

export interface IndexE<I, E> extends SingleE<E> {
  readonly _tag: 'IndexE'
  readonly index: I
}

export function indexE<I, E>(index: I, error: E): IndexE<I, E> {
  return { _tag: 'IndexE', index, error }
}

export interface ArrayE<E> extends ActualE<ReadonlyArray<unknown>>, CompoundE<E> {
  readonly _tag: 'ArrayE'
}

export function arrayE<E>(actual: ReadonlyArray<unknown>, errors: NonEmptyArray<E>): ArrayE<E> {
  return { _tag: 'ArrayE', actual, errors }
}

export interface RecordE<E> extends ActualE<ReadonlyRecord<string, unknown>>, CompoundE<E> {
  readonly _tag: 'RecordE'
}

export function recordE<E>(actual: ReadonlyRecord<string, unknown>, errors: NonEmptyArray<E>): RecordE<E> {
  return { _tag: 'RecordE', actual, errors }
}

export interface UnionE<E> extends CompoundE<E> {
  readonly _tag: 'UnionE'
}

export function unionE<E>(errors: NonEmptyArray<E>): UnionE<E> {
  return { _tag: 'UnionE', errors }
}

export interface RefineE<E> extends SingleE<E> {
  readonly _tag: 'RefineE'
}

export function refineE<E>(error: E): RefineE<E> {
  return { _tag: 'RefineE', error }
}

export interface ParseE<E> extends SingleE<E> {
  readonly _tag: 'ParseE'
}

export function parseE<E>(error: E): ParseE<E> {
  return { _tag: 'ParseE', error }
}

export interface IntersectionE<E> extends CompoundE<E> {
  readonly _tag: 'IntersectionE'
}

export function intersectionE<E>(errors: NonEmptyArray<E>): IntersectionE<E> {
  return { _tag: 'IntersectionE', errors }
}

export interface LazyE<E> extends SingleE<E> {
  readonly _tag: 'LazyE'
  readonly id: string
}

export function lazyE<E>(id: string, error: E): LazyE<E> {
  return { _tag: 'LazyE', id, error }
}

export interface MemberE<M, E> extends SingleE<E> {
  readonly _tag: 'MemberE'
  readonly member: M
}

export function memberE<M, E>(member: M, error: E): MemberE<M, E> {
  return { _tag: 'MemberE', member, error }
}

export interface TagNotFoundE<T, E> extends SingleE<E> {
  readonly _tag: 'TagNotFoundE'
  readonly tag: T
}

export function tagNotFoundE<T, E>(tag: T, error: E): TagNotFoundE<T, E> {
  return { _tag: 'TagNotFoundE', tag, error }
}

export interface SumE<E> extends CompoundE<E> {
  readonly _tag: 'SumE'
}

export function sumE<E>(errors: NonEmptyArray<E>): SumE<E> {
  return { _tag: 'SumE', errors }
}

export interface LabeledE<E> extends SingleE<E> {
  readonly _tag: 'LabeledE'
  readonly label: string
}

export function labeledE<E>(label: string, error: E): LabeledE<E> {
  return { _tag: 'LabeledE', label, error }
}

export interface MessageE<E> extends SingleE<E> {
  readonly _tag: 'MessageE'
  readonly message: string
}

export function messageE<E>(message: string, error: E): MessageE<E> {
  return { _tag: 'MessageE', message, error }
}

export type DecodeErrorPaths<E> =
  | { actual: unknown, expected: unknown }
  | {
      [k: string]: DecodeErrorPaths<E>
    }

/*
 * -------------------------------------------
 * warnings
 * -------------------------------------------
 */

export interface LeafW<W> {
  readonly _tag: 'LeafW'
  readonly warning: W
}

export interface KeyW {
  readonly _tag: 'KeyW'
  readonly key: string
}

export function keyW(key: string): KeyW {
  return { _tag: 'KeyW', key }
}

export interface UnexpectedKeyW {
  readonly _tag: 'UnexpectedKeyW'
  readonly key: string
}

export function unexpectedKeyW(key: string): UnexpectedKeyW {
  return { _tag: 'UnexpectedKeyW', key }
}

export interface ComponentW {
  readonly _tag: 'ComponentW'
  readonly component: number
}

export function componentW(component: number): ComponentW {
  return { _tag: 'ComponentW', component }
}

export interface UnexpectedComponentW {
  readonly _tag: 'UnexpectedComponentW'
  readonly component: number
}

export function unexpectedComponentW(component: number): UnexpectedComponentW {
  return { _tag: 'UnexpectedComponentW', component }
}

export interface IndexW {
  readonly _tag: 'IndexW'
  readonly index: number
}

export function indexW(index: number): IndexW {
  return { _tag: 'IndexW', index }
}

export type Warning = KeyW | UnexpectedKeyW | ComponentW | UnexpectedComponentW | IndexW

export interface Warnings extends Forest<Warning> {}
