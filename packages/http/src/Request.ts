import type * as http from "http";

export interface HttpRequest {
  readonly _req: http.ServerResponse;
}
