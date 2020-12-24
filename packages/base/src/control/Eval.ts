/*
 * -------------------------------------------
 * `Eval` is a direct port of the Eval monad from typelevel's `cats` library
 * -------------------------------------------
 */

import type * as P from "../typeclass";
import type { Stack } from "../util/support/Stack";

import { identity, tuple } from "../data/Function";
import * as O from "../data/Option";
import * as DSL from "../DSL";
import * as HKT from "../HKT";
import { makeStack } from "../util/support/Stack";

/**
 * `Eval<A>` is a monad that controls evaluation, providing a way to perform
 * stack-safe recursion through an internal trampoline.
 *
 * NOTE: `Eval` is for pure computation _only_. Side-effects should not be
 * performed within `Eval`. If you must perform side-effects,
 * use `Sync`, `Async`, or `IO` from the `io` package
 */
export abstract class Eval<A> {
  readonly _U = EvalURI;
  readonly _A!: () => A;

  abstract value: () => A;
  abstract memoize: () => Eval<A>;
}

export const EvalURI = "Eval";
export type EvalURI = typeof EvalURI;

declare module "../HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [EvalURI]: Eval<A>;
  }
}

class Now<A> extends Eval<A> {
  readonly _evalTag = "Now";
  constructor(readonly a: A) {
    super();
  }
  value = () => this.a;
  memoize = () => this;
}

class Later<A> extends Eval<A> {
  readonly _evalTag = "Later";
  private thunk: () => A;
  constructor(f: () => A) {
    super();
    this.thunk = f;
  }

  value = () => {
    const result = this.thunk();
    this.thunk = null as any;
    return result;
  };

  memoize = () => this;
}

class Always<A> extends Eval<A> {
  readonly _evalTag = "Always";
  constructor(readonly lazyVal: () => A) {
    super();
  }

  value = () => this.lazyVal();
  memoize = () => new Later(this.lazyVal);
}

class Defer<A> extends Eval<A> {
  readonly _evalTag = "Defer";
  constructor(readonly thunk: () => Eval<A>) {
    super();
  }
  memoize = (): Eval<A> => new Memoize(this);
  value = (): A => evaluate(this);
}

abstract class FlatMap<A, B> extends Eval<B> {
  readonly _evalTag = "FlatMap";
  abstract start: () => Eval<A>;
  abstract run: (a: A) => Eval<B>;
  memoize = (): Eval<B> => new Memoize(this);
  value = (): B => evaluate(this);
}

class Memoize<A> extends Eval<A> {
  readonly _evalTag = "Memoize";
  constructor(readonly ma: Eval<A>) {
    super();
  }
  public result: O.Option<A> = O.none();
  memoize = () => this;
  value = (): A =>
    O.fold_(
      this.result,
      () => {
        const a = evaluate(this);
        this.result = O.some(a);
        return a;
      },
      (a) => a
    );
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function now<A>(a: A): Eval<A> {
  return new Now(a);
}

export function later<A>(f: () => A): Eval<A> {
  return new Later(f);
}

export function always<A>(lazyVal: () => A): Eval<A> {
  return new Always(lazyVal);
}

export function defer<A>(thunk: () => Eval<A>): Eval<A> {
  return new Defer(thunk);
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export function pure<A>(a: A): Eval<A> {
  return now(a);
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function map2_<A, B, C>(ma: Eval<A>, mb: Eval<B>, f: (a: A, b: B) => C): Eval<C> {
  return flatMap_(ma, (a) => map_(mb, (b) => f(a, b)));
}

export function map2<A, B, C>(mb: Eval<B>, f: (a: A, b: B) => C): (ma: Eval<A>) => Eval<C> {
  return (ma) => map2_(ma, mb, f);
}

export function product_<A, B>(ma: Eval<A>, mb: Eval<B>): Eval<readonly [A, B]> {
  return map2_(ma, mb, tuple);
}

export function product<B>(mb: Eval<B>): <A>(ma: Eval<A>) => Eval<readonly [A, B]> {
  return (ma) => product_(ma, mb);
}

export function ap_<A, B>(mab: Eval<(a: A) => B>, ma: Eval<A>): Eval<B> {
  return map2_(mab, ma, (f, a) => f(a));
}

export function ap<A>(ma: Eval<A>): <B>(mab: Eval<(a: A) => B>) => Eval<B> {
  return (mab) => ap_(mab, ma);
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<A, B>(fa: Eval<A>, f: (a: A) => B): Eval<B> {
  return flatMap_(fa, (a) => now(f(a)));
}

export function map<A, B>(f: (a: A) => B): (fa: Eval<A>) => Eval<B> {
  return (fa) => map_(fa, f);
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function flatMap_<A, B>(ma: Eval<A>, f: (a: A) => Eval<B>): Eval<B> {
  const I = ma as Concrete;
  switch (I._evalTag) {
    case "FlatMap": {
      return new (class extends FlatMap<any, B> {
        start = (I as FlatMap<A, B>).start;
        run = (a: any): Eval<B> =>
          new (class extends FlatMap<A, B> {
            start = () => (I as FlatMap<any, A>).run(a);
            run = f;
          })();
      })();
    }
    case "Defer": {
      return new (class extends FlatMap<A, B> {
        start = (I as Defer<A>).thunk;
        run = f;
      })();
    }
    default: {
      return new (class extends FlatMap<A, B> {
        start = () => ma;
        run = f;
      })();
    }
  }
}

export function flatMap<A, B>(f: (a: A) => Eval<B>): (ma: Eval<A>) => Eval<B> {
  return (ma) => flatMap_(ma, f);
}

export function flatten<A>(mma: Eval<Eval<A>>): Eval<A> {
  return flatMap_(mma, identity);
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Eval<void> {
  return now(undefined);
}

/*
 * -------------------------------------------
 * Runtime
 * -------------------------------------------
 */

type Concrete = Now<any> | Later<any> | Defer<any> | Always<any> | FlatMap<any, any> | Memoize<any>;

class Frame {
  readonly _evalTag = "Frame";
  constructor(readonly apply: (e: any) => Eval<any>) {}
}

export function evaluate<A>(e: Eval<A>): A {
  const addToMemo = <A1>(m: Memoize<A1>) => (a: A1): Eval<A1> => {
    m.result = O.some(a);
    return new Now(a);
  };

  let frames: Stack<Frame> | undefined = makeStack(new Frame((_) => new Now(_)));
  let current = e as Eval<any> | undefined;
  let result = null;

  function popContinuation() {
    const nextInstr = frames;
    if (nextInstr) {
      frames = frames?.previous;
    }
    return nextInstr?.value;
  }

  function pushContinuation(cont: Frame) {
    frames = makeStack(cont, frames);
  }

  while (current != null) {
    const I = current as Concrete;
    switch (I._evalTag) {
      case "FlatMap": {
        const nested = I.start() as Concrete;
        switch (nested._evalTag) {
          case "FlatMap": {
            pushContinuation(new Frame(I.run));
            pushContinuation(new Frame(nested.run));
            current = nested.start();
            break;
          }
          case "Defer": {
            current = nested.thunk();
            pushContinuation(new Frame(I.run));
            break;
          }
          case "Memoize": {
            if (nested.result._tag === "Some") {
              current = I.run(nested.result.value);
              break;
            } else {
              pushContinuation(new Frame(I.run));
              pushContinuation(new Frame(addToMemo(nested)));
              current = nested.ma;
              break;
            }
          }
          default: {
            current = I.run(nested.value());
            break;
          }
        }
        break;
      }
      case "Defer": {
        current = I.thunk();
        break;
      }
      case "Memoize": {
        if (I.result._tag === "Some") {
          const f = popContinuation();
          if (f) {
            current = f.apply(I.result.value);
            break;
          } else {
            current = undefined;
            result = I.result.value;
            break;
          }
        } else {
          pushContinuation(new Frame(addToMemo(I)));
          current = I.ma;
          break;
        }
      }
      default: {
        const a1 = I.value();
        const f = popContinuation();
        if (f) {
          current = f.apply(a1);
          break;
        } else {
          current = undefined;
          result = a1;
          break;
        }
      }
    }
  }
  return result;
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Functor = HKT.instance<P.Functor<[EvalURI]>>({
  imap_: (fa, f, _) => map_(fa, f),
  imap: (f, _) => (fa) => map_(fa, f),
  map_,
  map
});

export const Apply = HKT.instance<P.Apply<[EvalURI]>>({
  ...Functor,
  ap_,
  ap,
  map2_,
  map2,
  product_,
  product
});

export const Applicative = HKT.instance<P.Applicative<[EvalURI]>>({
  ...Apply,
  pure,
  unit
});

export const Monad = HKT.instance<P.Monad<[EvalURI]>>({
  ...Applicative,
  flatMap_,
  flatMap,
  flatten
});

export const gen = DSL.genF(Monad);
