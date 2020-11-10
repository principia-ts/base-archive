import * as T from "../_core";

export const taskify: {
   <L, R>(f: (cb: (e: L | null | undefined, r?: R) => void) => void): () => T.EIO<L, R>;
   <A, L, R>(f: (a: A, cb: (e: L | null | undefined, r?: R) => void) => void): (a: A) => T.EIO<L, R>;
   <A, B, L, R>(f: (a: A, b: B, cb: (e: L | null | undefined, r?: R) => void) => void): (a: A, b: B) => T.EIO<L, R>;
   <A, B, C, L, R>(f: (a: A, b: B, c: C, cb: (e: L | null | undefined, r?: R) => void) => void): (
      a: A,
      b: B,
      c: C
   ) => T.EIO<L, R>;
   <A, B, C, D, L, R>(f: (a: A, b: B, c: C, d: D, cb: (e: L | null | undefined, r?: R) => void) => void): (
      a: A,
      b: B,
      c: C,
      d: D
   ) => T.EIO<L, R>;
   <A, B, C, D, E, L, R>(f: (a: A, b: B, c: C, d: D, e: E, cb: (e: L | null | undefined, r?: R) => void) => void): (
      a: A,
      b: B,
      c: C,
      d: D,
      e: E
   ) => T.EIO<L, R>;
} = <L, R>(f: Function): (() => T.EIO<L, R>) =>
   function () {
      // eslint-disable-next-line prefer-rest-params
      const args = Array.prototype.slice.call(arguments);

      return T.async((resolve) => {
         const cb = (e: L, r: R) => (e != null ? resolve(T.fail(e)) : resolve(T.succeed(r)));
         // eslint-disable-next-line prefer-spread
         f.apply(null, args.concat(cb));
      });
   };
