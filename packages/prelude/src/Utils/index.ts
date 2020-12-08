export { Compute, ComputeDeep, ComputeFlat, ComputeRaw } from "./compute";

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

export interface Separated<A, B> {
  readonly left: A;
  readonly right: B;
}

export type Erase<R, K> = R & K extends K & infer R1 ? R1 : R;

/**
 * Excludes properties of type V from T
 */
export type ExcludeMatchingProperties<T, V> = Pick<
  T,
  { [K in keyof T]-?: T[K] extends V ? never : K }[keyof T]
>;
