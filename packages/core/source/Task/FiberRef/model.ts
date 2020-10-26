export interface FiberRef<A> {
   readonly _tag: "FiberRef";
   readonly initial: A;
   readonly fork: (a: A) => A;
   readonly join: (a: A, a1: A) => A;
}
