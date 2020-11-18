import * as D from "@principia/core/Decoder";
import * as E from "@principia/core/Either";
import { flow, pipe } from "@principia/core/Function";

import * as M from "../source";

const t = M.make((F) =>
  F.intersection([
    F.type({
      a: F.optional(F.string({ name: "a string" }), { name: "an optional string" }),
      b: F.number({ name: "a number" })
    }),
    F.type({
      c: pipe(F.number(), (h) => F.refine(h, (a): a is number => a === 42, "the meaning of life"))
    })
  ] as const)
);

pipe(
  M.decoder(t).decode({ a: "hello", b: 21, c: 43 }),
  E.tap((a) => E.right(console.log(a))),
  E.map(M.encoder(t).encode),
  E.fold(
    (e) => console.log(D.draw(e)),
    (a) => console.log(a)
  )
);
