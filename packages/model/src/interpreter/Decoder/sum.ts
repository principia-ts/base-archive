import * as DE from "@principia/core/DecodeError";
import * as D from "@principia/core/Decoder";
import * as E from "@principia/core/Either";
import { pipe } from "@principia/core/Function";
import * as O from "@principia/core/Option";
import * as R from "@principia/core/Record";
import { pureF } from "@principia/prelude";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { URI } from "./HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const SumDecoder = implementInterpreter<URI, Alg.SumURI>()((_) => ({
  taggedUnion: (tag, types, config) => (env) => {
    const decoders = R.map_(types, (_) => _(env));
    return applyDecoderConfig(config?.config)(
      (M) =>
        D.sum_(M)(
          tag,
          R.map_(decoders, (_) => _(M)),
          extractInfo(config)
        ),
      env,
      decoders as any
    );
  },
  either: (left, right, config) => (env) =>
    pipe(left(env), (l) =>
      pipe(right(env), (r) =>
        applyDecoderConfig(config?.config)(
          (M) =>
            pipe(
              D.UnknownRecord(M)(),
              D.parse(M)((u) => {
                if (
                  "_tag" in u &&
                  ((u["_tag"] === "Left" && "left" in u) || (u["_tag"] === "Right" && "right" in u))
                ) {
                  if (u["_tag"] === "Left") {
                    return M.map_(l(M).decode(u["left"]), E.left) as any;
                  } else {
                    return M.map_(r(M).decode(u["right"]), E.right);
                  }
                } else {
                  return M.fail(DE.error(u, "Either", extractInfo(config)));
                }
              })
            ),
          env,
          { left: l, right: r }
        )
      )
    ),
  option: (a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        (M) =>
          pipe(
            D.UnknownRecord(M)(),
            D.parse(M)((u) => {
              if ("_tag" in u && (u["_tag"] === "None" || (u["_tag"] === "Some" && "value" in u))) {
                if (u["_tag"] === "Some") {
                  return M.map_(decoder(M).decode(u["value"]), O.some);
                } else {
                  return pureF(M)(O.none());
                }
              } else {
                return M.fail(DE.error(u, "Option", extractInfo(config)));
              }
            })
          ),
        env,
        decoder
      )
    )
}));
