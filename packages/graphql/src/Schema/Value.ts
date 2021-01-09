import type { GraphQlException } from './GraphQlException'
import type { Integer } from '@principia/base/Integer'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { FStream } from '@principia/io/Stream'

export type InputValue = ListInputValue | ObjectInputValue | VariableInputValue | Value

export interface ListInputValue {
  readonly _tag: 'ListInputValue'
  readonly values: ReadonlyArray<InputValue>
}

export function ListInputValue(values: ReadonlyArray<InputValue>): ListInputValue {
  return {
    _tag: 'ListInputValue',
    values
  }
}

export interface ObjectInputValue {
  readonly _tag: 'ObjectInputValue'
  readonly fields: ReadonlyRecord<string, InputValue>
}

export function ObjectInputValue(fields: ReadonlyRecord<string, InputValue>): ObjectInputValue {
  return {
    _tag: 'ObjectInputValue',
    fields
  }
}

export interface VariableInputValue {
  readonly _tag: 'VariableInputValue'
  readonly name: string
}

export function VariableInputValue(name: string): VariableInputValue {
  return {
    _tag: 'VariableInputValue',
    name
  }
}

export type ResponseValue = ListResponseValue | ObjectResponseValue | StreamResponseValue | Value

export interface ListResponseValue {
  readonly _tag: 'ListResponseValue'
  readonly values: ReadonlyArray<ResponseValue>
}

export function ListResponseValue(values: ReadonlyArray<ResponseValue>): ListResponseValue {
  return {
    _tag: 'ListResponseValue',
    values
  }
}

export interface ObjectResponseValue {
  readonly _tag: 'ObjectResponseValue'
  readonly fields: ReadonlyRecord<string, ResponseValue>
}

export function ObjectResponseValue(fields: ReadonlyRecord<string, ResponseValue>): ObjectResponseValue {
  return {
    _tag: 'ObjectResponseValue',
    fields
  }
}

export interface StreamResponseValue {
  readonly _tag: 'StreamResponseValue'
  readonly stream: FStream<GraphQlException, ResponseValue>
}

export function StreamResponseValue(stream: FStream<GraphQlException, ResponseValue>): StreamResponseValue {
  return {
    _tag: 'StreamResponseValue',
    stream
  }
}

export type Value = NullValue | StringValue | IntValue | FloatValue | BooleanValue | EnumValue

export interface NullValue {
  readonly _tag: 'NullValue'
}

export function NullValue(): NullValue {
  return {
    _tag: 'NullValue'
  }
}

export interface StringValue {
  readonly _tag: 'StringValue'
  readonly value: string
}

export function StringValue(value: string): StringValue {
  return {
    _tag: 'StringValue',
    value
  }
}

export interface IntValue {
  readonly _tag: 'IntValue'
  readonly value: Integer
}

export function IntValue(value: Integer): IntValue {
  return {
    _tag: 'IntValue',
    value
  }
}

export interface FloatValue {
  readonly _tag: 'FloatValue'
  readonly value: number
}

export function FloatValue(value: number): FloatValue {
  return {
    _tag: 'FloatValue',
    value
  }
}

export interface BooleanValue {
  readonly _tag: 'BooleanValue'
  readonly value: boolean
}

export function BooleanValue(value: boolean): BooleanValue {
  return {
    _tag: 'BooleanValue',
    value
  }
}

export interface EnumValue {
  readonly _tag: 'EnumValue'
  readonly value: string
}

export function EnumValue(value: string): EnumValue {
  return {
    _tag: 'EnumValue',
    value
  }
}
