import type { DecodeErrors, ErrorInfo } from "./DecodeErrors";
import type { UnfixedDecoderK } from "./KleisliDecoder2";
import type { Refinement } from "@principia/base/data/Function";
import type { Integer } from "@principia/base/data/Integer";
import type { ReadonlyRecord } from "@principia/base/data/Record";
import type { Literal } from "@principia/base/util/types";

import * as A from "@principia/base/data/Array";
import * as G from "@principia/base/data/Guard";

import { error } from "./DecodeErrors";
import * as K from "./KleisliDecoder2";

interface DecoderMetadata {
  readonly name: string;
}

export interface Decoder<I, O> extends UnfixedDecoderK<I, DecodeErrors, O> {
  readonly _meta: DecoderMetadata;
}

export function addMetadata_<I, O>(
  decoder: UnfixedDecoderK<I, DecodeErrors, O>,
  meta: DecoderMetadata
): Decoder<I, O> {
  const newF: typeof decoder = ((x: any) => decoder(x)) as any;
  return Object.assign(newF, { _meta: meta });
}

export function fromRefinement<I, A extends I>(
  refinement: Refinement<I, A>,
  expected: string,
  info?: ErrorInfo
): Decoder<I, A> {
  return addMetadata_(
    K.fromRefinement(refinement, (i) => error(i, expected, info)),
    { name: expected }
  );
}

export function fromGuard<I, A extends I>(
  guard: G.Guard<I, A>,
  expected: string,
  info?: ErrorInfo
): Decoder<I, A> {
  return fromRefinement(guard.is, expected, info);
}

export function literal<A extends readonly [Literal, ...Literal[]]>(
  ...values: A
): (info?: ErrorInfo) => Decoder<unknown, A[number]> {
  const name = A.map_(values, (value) => JSON.stringify(value)).join(" | ");
  return (info) => addMetadata_(K.literal((u, _) => error(u, name, info))(...values), { name });
}

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export function string(info?: ErrorInfo): Decoder<unknown, string> {
  return fromGuard(G.string, "string", info);
}

export function number(info?: ErrorInfo): Decoder<unknown, number> {
  return fromGuard(G.number, "number", info);
}

export function integer(info?: ErrorInfo): Decoder<unknown, Integer> {
  return fromGuard(G.safeInteger, "integer", info);
}

export function boolean(info?: ErrorInfo): Decoder<unknown, boolean> {
  return fromGuard(G.boolean, "boolean", info);
}

export function UnknownArray(info?: ErrorInfo): Decoder<unknown, ReadonlyArray<unknown>> {
  return fromGuard(G.UnknownArray, "Array<unknown>", info);
}

export function UnknownRecord(info?: ErrorInfo): Decoder<unknown, ReadonlyRecord<string, unknown>> {
  return fromGuard(G.UnknownRecord, "Record<string, unknown>", info);
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

export function alt_<I, O>(me: Decoder<I, O>, that: () => Decoder<I, O>): Decoder<I, O> {
  return addMetadata_(K.alt_(me, that), { name: `${me._meta.name} <!> ${that()._meta.name}` });
}
