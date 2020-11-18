export interface CombineFn_<A> {
  (l: A, r: A): A;
}

export interface CombineFn<A> {
  (r: A): (l: A) => A;
}
