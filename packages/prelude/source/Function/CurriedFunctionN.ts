type Length<A extends ReadonlyArray<unknown>> = A extends { length: infer L } ? L : never;

type Tail<A extends ReadonlyArray<unknown>> = A extends [infer Head, ...infer Rest] ? Rest : never;

type Head<A extends ReadonlyArray<unknown>> = A extends [infer Head, ...infer Rest] ? Head : never;

type Last<A extends ReadonlyArray<unknown>> = 1 extends Length<A> ? A[0] : Last<Tail<A>>;

type Push<A extends ReadonlyArray<unknown>, B> = [...A, B];

type Init<A extends ReadonlyArray<unknown>, Acc extends ReadonlyArray<unknown> = readonly []> = 1 extends Length<A>
   ? Acc
   : Init<Tail<A>, Push<Acc, Head<A>>>;

type CurriedFunctionN<A extends ReadonlyArray<unknown>, B> = (
   _: Head<A>
) => 0 extends Length<Tail<A>> ? B : CurriedFunctionN<Tail<A>, B>;
