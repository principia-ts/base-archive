export interface Interrupt {
  readonly _tag: 'Interrupt'
}

export interface Success<A> {
  readonly _tag: 'Success'
  readonly value: A
}

export interface Failure<E> {
  readonly _tag: 'Failure'
  readonly error: E
}

export type Rejection<E> = Interrupt | Failure<E>

export type AsyncExit<E, A> = Rejection<E> | Success<A>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export const failure = <E = never>(e: E): Rejection<E> => ({
  _tag: 'Failure',
  error: e
})

export const success = <E = never, A = never>(a: A): AsyncExit<E, A> => ({
  _tag: 'Success',
  value: a
})

export const interrupted = <E = never>(): Rejection<E> => ({
  _tag: 'Interrupt'
})
