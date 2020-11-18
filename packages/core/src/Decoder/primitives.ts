import * as G from "../Guard";
import { fromGuard } from "./constructors";
import type { ErrorInfo } from "./decode-error";

export function string(info?: ErrorInfo) {
  return fromGuard(G.string, "string", info);
}

export function number(info?: ErrorInfo) {
  return fromGuard(G.number, "number", info);
}

export function boolean(info?: ErrorInfo) {
  return fromGuard(G.boolean, "boolean", info);
}

export function UnknownArray(info?: ErrorInfo) {
  return fromGuard(G.UnknownArray, "Array<unknown>", info);
}

export function UnknownRecord(info?: ErrorInfo) {
  return fromGuard(G.UnknownRecord, "Record<string, unknown>", info);
}
