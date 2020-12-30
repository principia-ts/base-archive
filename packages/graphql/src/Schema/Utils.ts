import type { FieldRecord, GQLField, InputRecord } from './Types'
import type { Compute } from '@principia/base/util/compute'
import type { _A, ExcludeMatchingProperties, UnionToIntersection } from '@principia/base/util/types'

export type NonRequiredInputKeys<T extends InputRecord<T>> = keyof ExcludeMatchingProperties<
  {
    [k in keyof T]: T[k]['config']['nullable'] extends true ? k : never
  },
  never
>

export type RequiredInputKeys<T extends InputRecord<T>> = Exclude<keyof T, NonRequiredInputKeys<T>>

export type TypeofInputRecord<T extends InputRecord<T>> = Compute<
  {
    [k in NonRequiredInputKeys<T>]?: _A<T[k]>
  } &
    {
      [k in RequiredInputKeys<T>]: _A<T[k]>
    },
  'flat'
>

export type __R<Fs extends FieldRecord<any, any, any>> = UnionToIntersection<
  {
    [K in keyof Fs]: [Fs[K]] extends [{ _R: (_: infer R) => void }] ? (unknown extends R ? never : R) : never
  }[keyof Fs]
>

export type __E<Fs extends FieldRecord<any, any, any>> = Compute<
  {
    [K in keyof Fs]: [Fs[K]] extends [GQLField<any, any, any, any, infer E, any>] ? E : never
  }[keyof Fs]
>

export type __A<Fs extends FieldRecord<any, any, any>> = Compute<
  {
    [K in keyof Fs]: _A<Fs[K]>
  }
>
