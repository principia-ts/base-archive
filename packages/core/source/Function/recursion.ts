import { FunctionN, Lazy } from "./Function";

export interface Done<A> {
   readonly _tag: "Done";
   readonly value: A;
}

export interface More<A> {
   readonly _tag: "More";
   readonly fn: Lazy<Trampoline<A>>;
}

export type Trampoline<A> = More<A> | Done<A>;

export const done = <A>(a: A): Done<A> => ({
   _tag: "Done",
   value: a
});

export const more = <A>(f: Lazy<Trampoline<A>>): More<A> => ({
   _tag: "More",
   fn: f
});

export const map = <A, B>(fa: Trampoline<A>, f: (a: A) => B): Trampoline<B> => {
   switch (fa._tag) {
      case "More":
         return more(() => map(fa, f));
      case "Done":
         return done(f(fa.value));
   }
};

export const bind = <A, B>(fa: Trampoline<A>, f: (a: A) => Trampoline<B>): Trampoline<B> => {
   switch (fa._tag) {
      case "More":
         return more(() => bind(fa, f));
      case "Done":
         return f(fa.value);
   }
};

export const zip = <A, B>(ta: Trampoline<A>, tb: Trampoline<B>): Trampoline<readonly [A, B]> => {
   return bind(ta, (a) => map(tb, (b) => [a, b]));
};

export const trampoline = <A extends ReadonlyArray<unknown>, B>(
   fn: FunctionN<A, Trampoline<B>>
) => (...args: A): B => {
   let result = fn(...args);
   /* eslint-disable-next-line */
      while (true) {
      switch (result._tag) {
         case "More":
            result = result.fn();
            break;
         case "Done":
            return result.value;
      }
   }
};
