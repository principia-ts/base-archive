import type { Refinement } from "../Function";
import type { Guard } from "../Guard";
import * as K from "../KleisliDecoder";
import type { Literal } from "../Utils";
import type { ErrorInfo } from "./decode-error";
import { error } from "./decode-error";
import type { Decoder } from "./model";
import { M } from "./monad";

export function fromRefinement<I, A extends I>(
  refinement: Refinement<I, A>,
  expected: string,
  info?: ErrorInfo
): Decoder<I, A> {
  return {
    decode: K.fromRefinement(M)(refinement, (u) => error(u, expected, info)).decode,
    _meta: {
      name: expected
    }
  };
}

export function fromGuard<I, A extends I>(
  guard: Guard<I, A>,
  expected: string,
  info?: ErrorInfo
): Decoder<I, A> {
  return fromRefinement(guard.is, expected, info);
}

export function literal<A extends readonly [Literal, ...Array<Literal>]>(
  ...values: A
): (info?: ErrorInfo | undefined) => Decoder<unknown, A[number]> {
  return (info) => ({
    decode: K.literal(M)((u, values) =>
      error(u, values.map((value) => JSON.stringify(value)).join(" | "), info)
    )(...values).decode,
    _meta: {
      name: values.map((value) => JSON.stringify(value)).join(" | ")
    }
  });
}
