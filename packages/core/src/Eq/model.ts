import type { Eq } from "@principia/prelude/Eq";

export type TypeOf<E> = E extends Eq<infer A> ? A : never;

export * from "@principia/prelude/Eq/model";
