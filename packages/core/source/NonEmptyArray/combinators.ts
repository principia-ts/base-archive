import { NonEmptyArray } from "./NonEmptyArray";

export const head = <A>(as: NonEmptyArray<A>) => as[0];

export const tail = <A>(as: NonEmptyArray<A>) => as.slice(1);
