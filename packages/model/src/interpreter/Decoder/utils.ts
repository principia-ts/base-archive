import type { ErrorInfo } from "@principia/core/Decoder";

import type { Config } from "../../HKT";

export function extractInfo(config?: Config<any, any, any, any, any, any>): ErrorInfo {
   return config ? { message: config?.message, id: config?.id, name: config?.name } : {};
}
