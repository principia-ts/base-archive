export interface CombineFn_<A> {
  (x: A, y: A): A;
}

export interface CombineFn<A> {
  (y: A): (x: A) => A;
}
