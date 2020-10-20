import * as E from "@principia/core/Either";
import { pipe } from "@principia/core/Function";
import * as O from "@principia/core/Option";
import * as R from "@principia/core/Record";

import * as D from "../../../Decoder";
import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const SumDecoder = implementInterpreter<D.URI, Alg.SumURI>()((_) => ({
   taggedUnion: (tag, types, config) => (env) => {
      const decoders = R.map_(types, (_) => _(env));
      return applyDecoderConfig(config?.config)(D.sum_(tag, decoders, extractInfo(config)), env, decoders as any);
   },
   either: (left, right, config) => (env) =>
      pipe(left(env), (l) =>
         pipe(right(env), (r) =>
            applyDecoderConfig(config?.config)(
               pipe(
                  D.UnknownRecord(),
                  D.parse((u) => {
                     if (
                        "_tag" in u &&
                        ((u["_tag"] === "Left" && "left" in u) || (u["_tag"] === "Right" && "right" in u))
                     ) {
                        if (u["_tag"] === "Left") {
                           return E.map_(l.decode(u["left"]), E.left);
                        } else {
                           return E.map_(r.decode(u["right"]), E.right);
                        }
                     } else {
                        return E.left(D.error(u, "Either", extractInfo(config)));
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
            pipe(
               D.UnknownRecord(),
               D.parse((u) => {
                  if ("_tag" in u && (u["_tag"] === "None" || (u["_tag"] === "Some" && "value" in u))) {
                     if (u["_tag"] === "Some") {
                        return E.map_(decoder.decode(u["value"]), O.some);
                     } else {
                        return E.right(O.none());
                     }
                  } else {
                     return E.left(D.error(u, "Option", extractInfo(config)));
                  }
               })
            ),
            env,
            decoder
         )
      )
}));
