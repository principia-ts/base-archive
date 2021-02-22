import type { Const } from './Const'
import type { Either } from './Either'
import type { Eq } from './Eq'
import type { Eval } from './Eval'
import type { Guard } from './Guard'
import type { Identity } from './Identity'
import type { List } from './List'
import type { NonEmptyArray } from './NonEmptyArray'
import type { Option } from './Option'
import type { Reader } from './Reader'
import type { ReadonlyRecord } from './Record'
import type { Show } from './Show'
import type { StateIn, StateOut } from './StateT'
import type { These } from './These'
import type { Tuple2 } from './Tuple2'

export const ArrayURI = 'Array'
export type ArrayURI = typeof ArrayURI

export const ConstURI = 'Const'
export type ConstURI = typeof ConstURI

export const EitherURI = 'Either'
export type EitherURI = typeof EitherURI

export const EvalURI = 'Eval'
export type EvalURI = typeof EvalURI

export const GuardURI = 'Guard'
export type GuardURI = typeof GuardURI

export const IdentityURI = 'Identity'
export type IdentityURI = typeof IdentityURI

export const IterableURI = 'Iterable'
export type IterableURI = typeof IterableURI

export const AsyncIterableURI = 'AsyncIterable'
export type AsyncIterableURI = typeof AsyncIterableURI

export const ListURI = 'List'
export type ListURI = typeof ListURI

export const MapURI = 'Map'
export type MapURI = typeof MapURI

export const NonEmptyArrayURI = 'NonEmptyArray'
export type NonEmptyArrayURI = typeof NonEmptyArrayURI

export const OptionURI = 'Option'
export type OptionURI = typeof OptionURI

export const ReaderURI = 'Reader'
export type ReaderURI = typeof ReaderURI

export const RecordURI = 'Record'
export type RecordURI = typeof RecordURI

export const StateInURI = 'StateIn'
export type StateInURI = typeof StateInURI

export const StateOutURI = 'StateOut'
export type StateOutURI = typeof StateOutURI

export const TheseURI = 'These'
export type TheseURI = typeof TheseURI

export const Tuple2URI = 'Tuple2'
export type Tuple2URI = typeof Tuple2URI

export const ShowURI = 'Show'
export type ShowURI = typeof ShowURI

export const EqURI = 'Eq'
export type EqURI = typeof EqURI

declare module './HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [ArrayURI]: ReadonlyArray<A>
    [ConstURI]: Const<E, A>
    [EitherURI]: Either<E, A>
    [EvalURI]: Eval<A>
    [GuardURI]: Guard<unknown, A>
    [IdentityURI]: Identity<A>
    [IterableURI]: Iterable<A>
    [AsyncIterableURI]: AsyncIterable<A>
    [ListURI]: List<A>
    [MapURI]: ReadonlyMap<K, A>
    [NonEmptyArrayURI]: NonEmptyArray<A>
    [OptionURI]: Option<A>
    [ReaderURI]: Reader<R, A>
    [RecordURI]: ReadonlyRecord<N, A>
    [StateInURI]: StateIn<S, A>
    [StateOutURI]: StateOut<S, A>
    [TheseURI]: These<E, A>
    [Tuple2URI]: Tuple2<A, I>
    [ShowURI]: Show<A>
    [EqURI]: Eq<A>
  }
  interface URItoIndex<N, K> {
    [ArrayURI]: number
    [MapURI]: K
    [NonEmptyArrayURI]: number
    [RecordURI]: N
    [IterableURI]: number
    [AsyncIterableURI]: number
  }
}
