import type { ReadonlyRecord } from "@principia/core/Record";
import * as E from "@principia/prelude/Eq";

import type { Eq } from "./model";

export const string: Eq<string> = E.eqString;

export const number: Eq<number> = E.eqNumber;

export const boolean: Eq<boolean> = E.eqBoolean;

export const UnknownArray: Eq<ReadonlyArray<unknown>> = E.fromEquals((x, y) => x.length === y.length);

export const UnknownRecord: Eq<ReadonlyRecord<string, unknown>> = E.fromEquals((x, y) => {
   for (const k in x) {
      if (!(k in y)) {
         return false;
      }
   }
   for (const k in y) {
      if (!(k in x)) {
         return false;
      }
   }
   return true;
});
