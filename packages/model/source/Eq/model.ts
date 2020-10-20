import type * as E from "@principia/prelude/Eq";

export type Eq<A> = E.Eq<A>;

export type URI = E.URI;

export type TypeOf<E> = E extends Eq<infer A> ? A : never;
