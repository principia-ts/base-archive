export interface Stack<A> {
   readonly value: A;
   readonly previous?: Stack<A>;
}
