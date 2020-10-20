import * as G from "../Guard";
import { fromGuard } from "./constructors";
import type { ErrorInfo } from "./decode-error";

export const string = (info?: ErrorInfo) => fromGuard(G.string, "string", info);

export const number = (info?: ErrorInfo) => fromGuard(G.number, "number", info);

export const boolean = (info?: ErrorInfo) => fromGuard(G.boolean, "boolean", info);

export const UnknownArray = (info?: ErrorInfo) => fromGuard(G.UnknownArray, "Array<unknown>", info);

export const UnknownRecord = (info?: ErrorInfo) => fromGuard(G.UnknownRecord, "Record<string, unknown>", info);
