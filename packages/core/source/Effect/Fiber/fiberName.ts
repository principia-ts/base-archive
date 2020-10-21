import { identity } from "../../Function";
import * as O from "../../Option";
import { fiberRef } from "../FiberRef";

export const fiberName = fiberRef<O.Option<string>>(O.none(), identity, identity);
