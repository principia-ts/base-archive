export type Literal = string | number | boolean | null

export type _A<T> = [T] extends [{ ['_A']: () => infer A }] ? A : never

export type _R<T> = [T] extends [{ ['_R']: (_: infer R) => void }] ? R : never

export type _E<T> = [T] extends [{ ['_E']: () => infer E }] ? E : never

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export interface Separated<A, B> {
  readonly left: A
  readonly right: B
}

export type Erase<R, K> = R & K extends K & infer R1 ? R1 : R

/**
 * Excludes properties of type V from T
 */
export type ExcludeMatchingProperties<T, V> = Pick<T, { [K in keyof T]-?: T[K] extends V ? never : K }[keyof T]>
