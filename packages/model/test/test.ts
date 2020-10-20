import * as E from "@principia/core/Either";
import { pipe } from "@principia/core/Function";

import * as D from "../source/Decoder";
import { deriveFor } from "../source/Morph/interpreter/Decoder";
import * as M from "../source/Morph/summoner";

const t = M.make((F) =>
   F.type({
      a: F.optional(F.string({ name: "a string" }), { name: "an optional string" }),
      b: F.number({ name: "a number" })
   })
);

E.fold_(
   deriveFor(M.make)({})(t).decode({ b: 123 }),
   (e) => console.log(D.draw(e)),
   (a) => console.log(a)
);
