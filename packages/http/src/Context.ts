import { tag } from "@principia/core/Has";
import type * as http from "http";

export interface Context {
  req: http.IncomingMessage;
  res: http.ServerResponse;
}

export const Context = tag<Context>();
