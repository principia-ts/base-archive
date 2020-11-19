import type * as P from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import type { ErrorInfo } from "../DecodeError";
import * as G from "../Guard";
import { fromGuard } from "./constructors";
import type { Decoder, V } from "./model";

export function string<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): (info?: ErrorInfo) => Decoder<M, C, unknown, string> {
  return (info) => fromGuard(M)(G.string, "string", info);
}

export function number<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): (info?: ErrorInfo) => Decoder<M, C, unknown, number> {
  return (info) => fromGuard(M)(G.number, "number", info);
}

export function boolean<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): (info?: ErrorInfo) => Decoder<M, C, unknown, boolean> {
  return (info) => fromGuard(M)(G.boolean, "boolean", info);
}

export function UnknownArray<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): (info?: ErrorInfo) => Decoder<M, C, unknown, ReadonlyArray<unknown>> {
  return (info) => fromGuard(M)(G.UnknownArray, "Array<unknown>", info);
}

export function UnknownRecord<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): (info?: ErrorInfo) => Decoder<M, C, unknown, Readonly<Record<string, unknown>>> {
  return (info) => fromGuard(M)(G.UnknownRecord, "Record<string, unknown>", info);
}
