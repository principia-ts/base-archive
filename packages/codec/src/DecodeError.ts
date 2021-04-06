import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Primitive } from '@principia/base/util/types'

export interface URItoDecodeError<E> {
  StringE: StringE
  NumberE: NumberE
  BooleanE: BooleanE
  UnknownArrayE: UnknownArrayE
  UnknownRecordE: UnknownRecordE
  LiteralE: LiteralE<readonly [Primitive, ...ReadonlyArray<Primitive>]>
  NullableE: NullableRE<E>
  OptionalE: OptionalRE<E>
  KeyE: KeyE<E>
  StructE: StructRE<E>
  PartialE: PartialRE<E>
  IndexE: IndexE<E>
  TupleE: TupleRE<E>
  ArrayE: ArrayRE<E>
  RecordE: RecordRE<E>
  UnionE: UnionRE<E>
  RefineE: RefineRE<E>
  ParseE: ParseRE<E>
  IntersectionE: IntersectRE<E>
  LazyE: LazyRE<E>
  TagE: TagE<any>
  SumE: SumE<E>
  LabeledE: LabeledRE<E>
  MessageE: MessageRE<E>
}

export type DecodeError<E> = E | URItoDecodeError<E>[keyof URItoDecodeError<any>]

export class StringE {
  readonly _tag = 'StringE'
  constructor(readonly actual: unknown) {}
}

export class NumberE {
  readonly _tag = 'NumberE'
  constructor(readonly actual: unknown) {}
}

export class BooleanE {
  readonly _tag = 'BooleanE'
  constructor(readonly actual: unknown) {}
}

export class UnknownArrayE {
  readonly _tag = 'UnknownArrayE'
  constructor(readonly actual: unknown) {}
}

export class UnknownNonEmptyArrayE {
  readonly _tag = 'UnknownNonEmptyArrayE'
  constructor(readonly actual: unknown) {}
}

export class UnknownRecordE {
  readonly _tag = 'UnknownRecordE'
  constructor(readonly actual: unknown) {}
}

export class BigIntE {
  readonly _tag = 'BigIntE'
  constructor(readonly actual: unknown) {}
}

export class DateFromStringE {
  readonly _tag = 'DateFromStringE'
  constructor(readonly actual: string) {}
}

export class LiteralE<A extends readonly [Primitive, ...ReadonlyArray<Primitive>]> {
  readonly _tag = 'LiteralE'
  constructor(readonly actual: unknown, readonly literals: A) {}
}

export class NullableE<E> {
  readonly _tag = 'NullableE'
  constructor(readonly actual: unknown, readonly error: E) {}
}

export class OptionalE<E> {
  readonly _tag = 'OptionalE'
  constructor(readonly actual: unknown, readonly error: E) {}
}

export class KeyE<E> {
  readonly _tag = 'KeyE'
  constructor(readonly actual: unknown, readonly key: string, readonly error: E) {}
}

export class StructE<E> {
  readonly _tag = 'StructE'
  constructor(readonly actual: unknown, readonly error: NonEmptyArray<KeyE<E>>) {}
}

export class PartialE<E> {
  readonly _tag = 'PartialE'
  constructor(readonly actual: unknown, readonly error: NonEmptyArray<KeyE<E>>) {}
}

export class NonExistentZeroIndexE {
  readonly _tag = 'NonExistentZeroIndexE'
  constructor(readonly actual: unknown) {}
}

export class IndexE<E> {
  readonly _tag = 'IndexE'
  constructor(readonly actual: unknown, readonly index: number, readonly error: E) {}
}

export class TupleE<E> {
  readonly _tag = 'TupleE'
  constructor(readonly actual: unknown, readonly error: NonEmptyArray<IndexE<E>>) {}
}

export class ArrayE<E> {
  readonly _tag = 'ArrayE'
  constructor(readonly actual: unknown, readonly error: NonEmptyArray<IndexE<E>>) {}
}

export class RecordE<E> {
  readonly _tag = 'RecordE'
  constructor(readonly actual: unknown, readonly error: NonEmptyArray<KeyE<E>>) {}
}

export class UnionE<E> {
  readonly _tag = 'UnionE'
  constructor(readonly actual: unknown, readonly error: NonEmptyArray<IndexE<E>>) {}
}

export class RefineE<E> {
  readonly _tag = 'RefineE'
  constructor(readonly actual: unknown, readonly error: E) {}
}

export class ParseE<E> {
  readonly _tag = 'ParseE'
  constructor(readonly actual: unknown, readonly error: E) {}
}

export class IntersectE<E> {
  readonly _tag = 'IntersectE'
  constructor(readonly actual: unknown, readonly error: NonEmptyArray<IndexE<E>>) {}
}

export class LazyE<E> {
  readonly _tag = 'LazyE'
  constructor(readonly id: string, readonly error: E) {}
}

export class TagE<A> {
  readonly _tag = 'TagE'
  constructor(readonly actual: unknown, readonly literals: NonEmptyArray<A>) {}
}

export class SumE<E> {
  readonly _tag = 'SumE'
  constructor(readonly actual: unknown, readonly error: NonEmptyArray<IndexE<E>>) {}
}

export class LabeledE<E> {
  readonly _tag = 'Labeled'
  constructor(readonly label: string, readonly error: DecodeError<E>) {}
}

export class MessageE<E> {
  readonly _tag = 'MessageE'
  constructor(readonly message: string, readonly error: DecodeError<E>) {}
}

export class KeyOfE<K> {
  readonly _tag = 'KeyOfE'
  constructor(readonly actual: string, readonly keys: NonEmptyArray<K>) {}
}

export interface NullableRE<E> extends NullableE<DecodeError<E>> {}
export interface OptionalRE<E> extends OptionalE<DecodeError<E>> {}
export interface RefineRE<E> extends RefineE<DecodeError<E>> {}
export interface ParseRE<E> extends ParseE<DecodeError<E>> {}
export interface StructRE<E> extends StructE<DecodeError<E>> {}
export interface PartialRE<E> extends PartialE<DecodeError<E>> {}
export interface TupleRE<E> extends TupleE<DecodeError<E>> {}
export interface ArrayRE<E> extends ArrayE<DecodeError<E>> {}
export interface RecordRE<E> extends RecordE<DecodeError<E>> {}
export interface UnionRE<E> extends UnionE<DecodeError<E>> {}
export interface IntersectRE<E> extends IntersectE<DecodeError<E>> {}
export interface LazyRE<E> extends LazyE<DecodeError<E>> {}
export interface LabeledRE<E> extends LabeledE<DecodeError<E>> {}
export interface MessageRE<E> extends MessageE<DecodeError<E>> {}

export type DecodeErrorPaths<E> =
  | { actual: unknown, expected: unknown }
  | {
      [k: string]: DecodeErrorPaths<E>
    }
