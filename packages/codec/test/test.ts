import * as E from "@principia/base/data/Either";
import { pipe } from "@principia/base/data/Function";

import { draw, getDecodeErrorsValidation } from "../src/DecodeErrors";
import * as D from "../src/Decoder2";

const M = getDecodeErrorsValidation({
  ...E.MonadFail,
  ...E.Bifunctor,
  ...E.Alt,
  ...E.Fallible
});

const d = D.fromRefinement((u: unknown): u is string => typeof u === "string", "string", {
  message: "That's no string"
});

console.log(d._meta);
