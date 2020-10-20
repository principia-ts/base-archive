import * as E from "@principia/core/Either";
import { pipe } from "@principia/core/Function";
import * as O from "@principia/core/Option";

import * as DE from "../../../DecodeError";
import * as D from "../../../Decoder";
import * as FS from "../../../FreeSemigroup";
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
               D.mapLeftWithInput((i, e) => FS.combine(e, FS.of(DE.info(extractInfo(config)))))
            ),
            env,
            decoder
         )
      ),
   newtypePrism: (prism, a, name, config) => (env) =>
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
