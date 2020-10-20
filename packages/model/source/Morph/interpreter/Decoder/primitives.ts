import * as A from "@principia/core/Array";
import * as E from "@principia/core/Either";
import { pipe } from "@principia/core/Function";
import type { Branded } from "@principia/prelude/Branded";

import * as DE from "../../../DecodeError";
import * as D from "../../../Decoder";
import * as FS from "../../../FreeSemigroup";
import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PrimitivesDecoder = implementInterpreter<D.URI, Alg.PrimitivesURI>()((_) => ({
   string: (config) => (env) => applyDecoderConfig(config?.config)(D.string(extractInfo(config)), env, {}),
   number: (config) => (env) => applyDecoderConfig(config?.config)(D.number(extractInfo(config)), env, {}),
   boolean: (config) => (env) => applyDecoderConfig(config?.config)(D.boolean(extractInfo(config)), env, {}),
   literal: (...values) => (config) => (env) =>
      applyDecoderConfig(config?.config)(D.literal(...values)(extractInfo(config)), env, {}),
   stringLiteral: (value, config) => (env) =>
      applyDecoderConfig(config?.config)(D.literal(value)(extractInfo(config)), env, {}),
   numberLiteral: (value, config) => (env) =>
      applyDecoderConfig(config?.config)(D.literal(value)(extractInfo(config)), env, {}),
   bigint: (config) => (env) =>
      applyDecoderConfig(config?.config)(
         pipe(
            D.string(),
            D.parse((a) =>
               E.partial_(
                  () => BigInt(a),
                  (_) => FS.combine(FS.of(DE.leaf(a, "integer string")), pipe(config, extractInfo, DE.info, FS.of))
               )
            )
         ),
         env,
         {}
      ),
   date: (config) => (env) =>
      applyDecoderConfig(config?.config)(
         pipe(
            D.string(),
            D.mapLeftWithInput((i, _) =>
               FS.combine(FS.of(DE.leaf(i, "date string")), pipe(config, extractInfo, DE.info, FS.of))
            ),
            D.parse((a) => {
               const d = new Date(a);
               return isNaN(d.getTime())
                  ? E.left(FS.combine(FS.of(DE.leaf(a, "date string")), pipe(config, extractInfo, DE.info, FS.of)))
                  : E.right(d);
            })
         ),
         env,
         {}
      ),
   array: (item, config) => (env) =>
      pipe(item(env), (decoder) =>
         applyDecoderConfig(config?.config)(D.array(decoder, extractInfo(config)), env, decoder)
      ),
   nonEmptyArray: (item, config) => (env) =>
      pipe(item(env), (decoder) =>
         applyDecoderConfig(config?.config)(
            pipe(D.array(decoder), D.refine(A.isNonEmpty, "NonEmptyArray")),
            env,
            decoder
         )
      ),
   keyof: (keys, config) => (env) =>
      applyDecoderConfig(config?.config)(
         pipe(
            D.string(),
            D.refine(
               (a): a is keyof typeof keys & string => Object.keys(keys).indexOf(a) !== -1,
               Object.keys(keys).join(" | ")
            )
         ),
         env,
         {}
      ),
   UUID: (config) => (env) =>
      applyDecoderConfig(config?.config)(
         pipe(
            D.string(),
            D.refine((a): a is Branded<string, Alg.UUIDBrand> => regexUUID.test(a), "UUID", extractInfo(config))
         ),
         env,
         {}
      )
}));
