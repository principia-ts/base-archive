import * as A from "../../Array";
import type { Either } from "../../Either";
import * as E from "../../Either";
import { AtomicNumber, AtomicReference } from "../../support";
import type { Cause } from "../Exit/Cause";
import * as C from "../Exit/Cause";
import type { IO } from "../Task";
import * as T from "../Task/_core";

/**
 * Represents a key in a scope, which is associated with a single finalizer.
 */
export class Key {
   /**
    * Attempts to remove the finalizer associated with this key from the
    * scope. The returned effect will succeed with a boolean, which indicates
    * whether the attempt was successful. A value of `true` indicates the
    * finalizer will not be executed, while a value of `false` indicates the
    * finalizer was already executed
    */
   remove: IO<boolean> = T.pure(false);
   constructor(remove?: IO<boolean>) {
      if (remove) {
         this.remove = remove;
      }
   }

   setRemove(remove: IO<boolean>) {
      this.remove = remove;
   }
}

/**
 * Represent Common Ops between Global | Local<A>
 */
export interface CommonScope<A> {
   /**
    * Determines if the scope is closed at the instant the effect executes.
    * Returns a task that will succeed with `true` if the scope is closed,
    * and `false` otherwise.
    */
   readonly closed: IO<boolean>;

   /**
    * Prevents a previously added finalizer from being executed when the scope
    * is closed. The returned effect will succeed with `true` if the finalizer
    * will not be run by this scope, and `false` otherwise.
    */
   readonly deny: (key: Key) => IO<boolean>;

   /**
    * Determines if the scope is empty (has no finalizers) at the instant the
    * effect executes. The returned effect will succeed with `true` if the scope
    * is empty, and `false` otherwise.
    */
   readonly empty: IO<boolean>;

   /**
    * Adds a finalizer to the scope. If successful, this ensures that when the
    * scope exits, the finalizer will be run
    *
    * The returned effect will succeed with a key ifthe finalizer was added
    * to the scope, and `None` if the scope is already closed.
    */
   readonly ensure: (finalizer: (a: A) => IO<any>) => IO<Either<A, Key>>;

   /**
    * Extends the specified scope so that it will not be closed until this
    * scope is closed. Note that extending a scope into the global scope
    * will result in the scope *never* being closed!
    *
    * Scope extension does not result in changes to the scope contract: open
    * scopes must *always* be closed.
    */
   readonly extend: (that: Scope<any>) => IO<boolean>;

   /**
    * Determines if the scope is open at the moment the effect is executed.
    * Returns a task that will succeed with `true` if the scope is open,
    * and `false` otherwise.
    */
   readonly open: IO<boolean>;

   /**
    * Determines if the scope has been released at the moment the effect is
    * executed. A scope can be closed yet unreleased, if it has been
    * extended by another scope which is not yet released.
    */
   readonly released: IO<boolean>;

   readonly unsafeEnsure: (finalizer: (_: A) => IO<any>) => Either<A, Key>;
   readonly unsafeExtend: (that: Scope<any>) => boolean;
   readonly unsafeDeny: (key: Key) => boolean;
}

/**
 * A `Scope<A>` is a value that allows adding finalizers identified by a key.
 * Scopes are closed with a value of type `A`, which is provided to all the
 * finalizers when the scope is released.
 *
 * For safety reasons, this interface has no method to close a scope. Rather,
 * an open scope may be required with `makeScope`, which returns a function
 * that can close a scope. This allows scopes to be safely passed around
 * without fear they will be accidentally closed.
 */
export type Scope<A> = GlobalScope | LocalScope<A>;

/**
 * The global scope, which is entirely stateless. Finalizers added to the
 * global scope will never be executed (nor kept in memory).
 */
export class GlobalScope implements CommonScope<never> {
   readonly _tag = "Global";

   constructor() {
      this.deny = this.deny.bind(this);
      this.ensure = this.ensure.bind(this);
      this.extend = this.extend.bind(this);
      this.unsafeEnsure = this.unsafeEnsure.bind(this);
      this.unsafeExtend = this.unsafeExtend.bind(this);
   }

   private unsafeEnsureResult = E.right(new Key(T.total(() => true)));

   private ensureResult = T.total(() => this.unsafeEnsureResult);

   get closed(): IO<boolean> {
      return T.pure(false);
   }

   deny(_key: Key): IO<boolean> {
      return T.pure(true);
   }

   get empty(): IO<boolean> {
      return T.pure(false);
   }

   ensure(_finalizer: (a: never) => IO<any>): IO<E.Either<never, Key>> {
      return this.ensureResult;
   }

   extend(that: Scope<any>): IO<boolean> {
      return T.total(() => this.unsafeExtend(that));
   }

   get open(): IO<boolean> {
      return T.map_(this.closed, (c) => !c);
   }

   get released(): IO<boolean> {
      return T.pure(false);
   }

   unsafeEnsure(_finalizer: (_: never) => IO<any>): E.Either<never, Key> {
      return this.unsafeEnsureResult;
   }

   unsafeExtend(that: Scope<any>): boolean {
      switch (that._tag) {
         case "Global":
            return true;
         case "Local":
            return that.unsafeAddRef();
      }
   }

   unsafeDeny() {
      return true;
   }
}

export class OrderedFinalizer {
   constructor(readonly order: number, readonly finalizer: (_: any) => IO<any>) {}
}

const noCause = C.empty;

const noCauseTask: IO<Cause<never>> = T.pure(noCause);

export class LocalScope<A> implements CommonScope<A> {
   readonly _tag = "Local";

   constructor(
      readonly finalizerCount: AtomicNumber,
      readonly exitValue: AtomicReference<A | null>,
      readonly references: AtomicNumber,
      readonly finalizers: Map<Key, OrderedFinalizer>
   ) {}

   get closed(): IO<boolean> {
      return T.total(() => this.unsafeClosed);
   }

   get open(): IO<boolean> {
      return T.map_(this.closed, (c) => !c);
   }

   deny(key: Key): IO<boolean> {
      return T.total(() => this.unsafeDeny(key));
   }

   get empty(): IO<boolean> {
      return T.total(() => this.finalizers.size === 0);
   }

   ensure(finalizer: (a: A) => IO<any>): IO<E.Either<A, Key>> {
      return T.total(() => this.unsafeEnsure(finalizer));
   }

   extend(that: Scope<any>): IO<boolean> {
      return T.total(() => this.unsafeExtend(that));
   }

   get released(): IO<boolean> {
      return T.total(() => this.unsafeReleased());
   }

   unsafeExtend(that: Scope<any>): boolean {
      if (this === that) {
         return true;
      }

      switch (that._tag) {
         case "Global":
            return true;
         case "Local":
            if (this.unsafeClosed && that.unsafeClosed) {
               that.unsafeAddRef();
               this.unsafeEnsure((_) => that.release);
               return true;
            } else {
               return false;
            }
      }
   }

   get release(): IO<boolean> {
      return T.suspend(() => {
         const result = this.unsafeRelease();

         if (result != null) {
            return result;
         } else {
            return T.pure(false);
         }
      });
   }

   unsafeReleased() {
      return this.references.get <= 0;
   }

   unsafeEnsure(finalizer: (_: A) => IO<any>): E.Either<A, Key> {
      if (this.unsafeClosed) {
         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
         return E.left(this.exitValue.get!);
      }

      const key = new Key();
      key.setRemove(this.deny(key));

      this.finalizers.set(key, new OrderedFinalizer(this.finalizerCount.incrementAndGet(), finalizer));

      return E.right(key);
   }

   unsafeAddRef(): boolean {
      if (this.unsafeClosed) {
         return false;
      }
      this.references.incrementAndGet();
      return true;
   }

   get unsafeClosed() {
      return this.exitValue.get != null;
   }

   unsafeDeny(key: Key) {
      if (this.unsafeClosed) {
         return false;
      } else {
         return this.finalizers.delete(key);
      }
   }

   unsafeClose(a: A): IO<any> | null {
      this.exitValue.compareAndSet(null, a);

      return this.unsafeRelease();
   }

   unsafeRelease(): IO<any> | null {
      if (this.references.decrementAndGet() === 0) {
         const totalSize = this.finalizers.size;

         if (totalSize === 0) {
            return null;
         }

         const array = Array.from(this.finalizers.values());

         const sorted = array.sort((l, r) => (l == null ? -1 : r == null ? 1 : l.order - r.order));

         const a = this.exitValue.get;

         return T.uncause(
            A.reduce_(sorted, noCauseTask, (acc, o) =>
               o != null ? T.mapBoth_(acc, T.cause(o.finalizer(a)), (a, b) => C.then(a, b)) : acc
            )
         );
      } else {
         return null;
      }
   }

   get unsafeEmpty() {
      return this.finalizers.size === 0;
   }
}

/**
 * The global scope, which is entirely stateless. Finalizers added to the
 * global scope will never be executed (nor kept in memory).
 */
export const globalScope = new GlobalScope();

/**
 * A tuple that contains an open scope, together with a function that closes
 * the scope.
 */
export class Open<A> {
   constructor(readonly close: (_: A) => IO<boolean>, readonly scope: LocalScope<A>) {}
}

export const unsafeMakeScope = <A>() => {
   const exitValue = new AtomicReference<A | null>(null);
   const finalizers = new Map<Key, OrderedFinalizer>();
   const scope = new LocalScope(new AtomicNumber(Number.MIN_SAFE_INTEGER), exitValue, new AtomicNumber(1), finalizers);

   return new Open<A>((a) => {
      return T.suspend(() => {
         const result = scope.unsafeClose(a);

         if (result != null) {
            return T.map_(result, () => true);
         } else {
            return T.pure(false);
         }
      });
   }, scope);
};

export const makeScope = <A>() => T.total(() => unsafeMakeScope<A>());
