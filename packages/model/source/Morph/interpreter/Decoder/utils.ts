import type { ErrorInfo } from "../../../Decoder";
import type { Config } from "../../HKT";

export const extractInfo = (config?: Config<any, any, any, any, any, any>): ErrorInfo =>
   config ? { message: config?.message, id: config?.id, name: config?.name } : {};
