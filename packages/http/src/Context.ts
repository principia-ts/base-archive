import { tag } from "@principia/core/Has";
import type * as http from "http";

export interface StatusOpen {
  readonly StatusOpen: unique symbol;
}

export interface HeadersOpen {
  readonly HeadersOpen: unique symbol;
}

export interface BodyOpen {
  readonly BodyOpen: unique symbol;
}

export interface ResponseEnded {
  readonly ResponseEnded: unique symbol;
}

type ConnectionState = StatusOpen | HeadersOpen | BodyOpen | ResponseEnded;

export interface Context {
  req: http.IncomingMessage;
  res: http.ServerResponse;
}

export const Context = tag<Context>();
