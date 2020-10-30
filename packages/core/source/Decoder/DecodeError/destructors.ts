import type { FreeSemigroup } from "../../FreeSemigroup";
import type { DecodeError, Kind } from "./model";

export const fold = <E, R>(patterns: {
   Leaf: (input: unknown, expected: string) => R;
   Key: (key: string, kind: Kind, errors: FreeSemigroup<DecodeError<E>>) => R;
   Index: (index: number, kind: Kind, errors: FreeSemigroup<DecodeError<E>>) => R;
   Member: (index: number, errors: FreeSemigroup<DecodeError<E>>) => R;
   Lazy: (id: string, errors: FreeSemigroup<DecodeError<E>>) => R;
   Wrap: (error: E, errors: FreeSemigroup<DecodeError<E>>) => R;
   Info: (error: E) => R;
}): ((e: DecodeError<E>) => R) => {
   const f = (e: DecodeError<E>): R => {
      switch (e._tag) {
         case "Leaf":
            return patterns.Leaf(e.actual, e.expected);
         case "Key":
            return patterns.Key(e.key, e.kind, e.errors);
         case "Index":
            return patterns.Index(e.index, e.kind, e.errors);
         case "Member":
            return patterns.Member(e.index, e.errors);
         case "Lazy":
            return patterns.Lazy(e.id, e.errors);
         case "Wrap":
            return patterns.Wrap(e.error, e.errors);
         case "Info":
            return patterns.Info(e.error);
      }
   };
   return f;
};
