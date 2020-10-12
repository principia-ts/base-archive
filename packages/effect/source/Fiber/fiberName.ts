import { identity } from "@principia/core/Function";
import * as O from "@principia/core/Option";

import { fiberRef } from "../FiberRef";

export const fiberName = fiberRef<O.Option<string>>(O.none(), identity, identity);
