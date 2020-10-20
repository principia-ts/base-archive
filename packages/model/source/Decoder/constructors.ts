import type { Refinement } from "@principia/core/Function";

import type { Guard } from "../Guard";
import * as K from "../KleisliDecoder";
import type { Literal } from "../utils";
import type { ErrorInfo } from "./decode-error";
import { error } from "./decode-error";
import type { Decoder } from "./model";
import { M } from "./monad";

export const fromRefinement = <I, A extends I>(
   refinement: Refinement<I, A>,
   expected: string,
   info?: ErrorInfo
): Decoder<I, A> => ({
   decode: K.fromRefinement(M)(refinement, (u) => error(u, expected, info)).decode,
   _meta: {
      name: expected
   }
});

export const fromGuard = <I, A extends I>(guard: Guard<I, A>, expected: string, info?: ErrorInfo): Decoder<I, A> =>
   fromRefinement(guard.is, expected, info);

export const literal: <A extends readonly [Literal, ...Array<Literal>]>(
   ...values: A
) => (info?: ErrorInfo) => Decoder<unknown, A[number]> = (...values) => (info) => ({
   decode: K.literal(M)((u, values) => error(u, values.map((value) => JSON.stringify(value)).join(" | "), info))(
      ...values
   ).decode,
   _meta: {
      name: values.map((value) => JSON.stringify(value)).join(" | ")
   }
});
