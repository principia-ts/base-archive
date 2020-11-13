import { identity } from "../../Function";
import * as O from "../../Option";
import { FiberRef } from "../FiberRef";

export const fiberName = new FiberRef<O.Option<string>>(O.none(), identity, identity);
