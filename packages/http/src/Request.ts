import { tag } from "@principia/core/Has";
import type * as http from "http";

export interface Request {
  req: http.IncomingMessage;
  res: http.ServerResponse;
}

export const Request = tag<Request>();
