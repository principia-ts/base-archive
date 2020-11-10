export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

export type Erase<R, K> = R & K extends K & infer R1 ? R1 : R;

export type Mutable<T> = { -readonly [k in keyof T]: T[k] };

export interface Separated<A, B> {
   readonly left: A;
   readonly right: B;
}
