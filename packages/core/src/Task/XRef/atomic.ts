import type { Option } from "../../Option";
import * as T from "../Task/_core";
import type { IO } from "../Task/model";
import type { Atomic } from "./model";

export const getAndSet = <A>(a: A) => (self: Atomic<A>): IO<A> =>
   T.total(() => {
      const v = self.value.get;
      self.value.set(a);
      return v;
   });

export const getAndUpdate = <A>(f: (a: A) => A) => (self: Atomic<A>): IO<A> =>
   T.total(() => {
      const v = self.value.get;
      self.value.set(f(v));
      return v;
   });

export const getAndUpdateSome = <A>(f: (a: A) => Option<A>) => (self: Atomic<A>): IO<A> =>
   T.total(() => {
      const v = self.value.get;
      const o = f(v);
      if (o._tag === "Some") {
         self.value.set(o.value);
      }
      return v;
   });

export const modify = <A, B>(f: (a: A) => readonly [B, A]) => (self: Atomic<A>): IO<B> =>
   T.total(() => {
      const v = self.value.get;
      const o = f(v);
      self.value.set(o[1]);
      return o[0];
   });

export const modifySome = <B>(def: B) => <A>(f: (a: A) => Option<readonly [B, A]>) => (self: Atomic<A>): IO<B> =>
   T.total(() => {
      const v = self.value.get;
      const o = f(v);

      if (o._tag === "Some") {
         self.value.set(o.value[1]);
         return o.value[0];
      }

      return def;
   });

export const update = <A>(f: (a: A) => A) => (self: Atomic<A>): IO<void> =>
   T.total(() => {
      self.value.set(f(self.value.get));
   });

export const updateAndGet = <A>(f: (a: A) => A) => (self: Atomic<A>): IO<A> => {
   return T.total(() => {
      self.value.set(f(self.value.get));
      return self.value.get;
   });
};

export const updateSome = <A>(f: (a: A) => Option<A>) => (self: Atomic<A>): IO<void> =>
   T.total(() => {
      const o = f(self.value.get);

      if (o._tag === "Some") {
         self.value.set(o.value);
      }
   });

export const updateSomeAndGet = <A>(f: (a: A) => Option<A>) => (self: Atomic<A>): IO<A> => {
   return T.total(() => {
      const o = f(self.value.get);

      if (o._tag === "Some") {
         self.value.set(o.value);
      }

      return self.value.get;
   });
};

export const unsafeUpdate = <A>(f: (a: A) => A) => (self: Atomic<A>) => {
   self.value.set(f(self.value.get));
};
