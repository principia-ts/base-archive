export type NonEmptyArray<A> = ReadonlyArray<A> & {
   readonly 0: A;
};
