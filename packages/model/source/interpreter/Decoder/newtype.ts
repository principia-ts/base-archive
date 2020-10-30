import * as D from "@principia/core/Decoder";
import * as DE from "@principia/core/Decoder/DecodeError";
import * as E from "@principia/core/Either";
import * as FS from "@principia/core/FreeSemigroup";
import { pipe } from "@principia/core/Function";
import * as O from "@principia/core/Option";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const NewtypeDecoder = implementInterpreter<D.URI, Alg.NewtypeURI>()((_) => ({
   newtypeIso: (iso, a, config) => (env) =>
      pipe(a(env), (decoder) =>
         applyDecoderConfig(config?.config)(
            pipe(
               decoder,
               D.map(iso.get),
               D.mapLeftWithInput((i, e) => FS.combine(e, FS.element(DE.info(extractInfo(config)))))
            ),
            env,
            decoder
         )
      ),
   newtypePrism: (prism, a, config) => (env) =>
      pipe(a(env), (decoder) =>
         pipe(
            decoder,
            D.parse((a) =>
               O.fold_(
                  prism.getOption(a),
                  () =>
                     E.left(
                        D.error(a, "", { message: "newtype does not satisfy prism conditions", ...extractInfo(config) })
                     ),
                  E.right
               )
            )
         )
      )
}));
