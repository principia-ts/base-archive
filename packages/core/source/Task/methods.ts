import { bind_, bindTo_, flow, identity } from "../Function";
import type * as TC from "../typeclass-index";
import type { InferA, Task, URI, V } from "./Task";

/*
 * -------------------------------------------
 * Task Methods
 * -------------------------------------------
 */

/**
 * ```haskell
 * pure :: a -> Task a
 * ```
 *
 * Lifts a pure value into a `Task`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure: TC.PureF<[URI], V> = (a) => () => Promise.resolve(a);

/**
 * ```haskell
 * any :: () -> Task Any
 * ```
 */
export const any: TC.UnitF<[URI], V> = () => () => Promise.resolve({} as any);

/**
 * ```haskell
 * _map :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export const _map: TC.UC_MapF<[URI], V> = (fa, f) => () => fa().then(f);

/**
 * ```haskell
 * map :: functor f => (a -> b) -> f a -> f b
 * ```
 *
 * lifts a function a -> b to a function f a -> f b
 *
 * @category functor
 * @since 1.0.0
 */
export const map: TC.MapF<[URI], V> = (f) => (fa) => _map(fa, f);

/**
 * ```haskell
 * _ap :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const _ap: TC.UC_ApF<[URI], V> = (fab, fa) => () => Promise.all([fab(), fa()]).then(([f, a]) => f(a));

/**
 * ```haskell
 * ap :: Apply f => f a -> f (a -> b) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const ap: TC.ApF<[URI], V> = (fa) => (fab) => _ap(fab, fa);

/**
 * ```haskell
 * _apFirst :: Apply f => (f a, f b) -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Uncurried Apply
 * @since 1.0.0
 */
export const _apFirst: TC.UC_ApFirstF<[URI], V> = (fa, fb) =>
   _ap(
      _map(fa, (a) => () => a),
      fb
   );

/**
 * ```haskell
 * apFirst :: Apply f => f b -> f a -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export const apFirst: TC.ApFirstF<[URI], V> = (fb) => (fa) => _apFirst(fa, fb);

/**
 * ```haskell
 * _apSecond :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export const _apSecond: TC.UC_ApSecondF<[URI], V> = <A, B>(fa: Task<A>, fb: Task<B>): Task<B> =>
   _ap(
      _map(fa, () => (b: B) => b),
      fb
   );

/**
 * ```haskell
 * apSecond :: Apply f => f b -> f a -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export const apSecond: TC.ApSecondF<[URI], V> = (fb) => (fa) => _apSecond(fa, fb);

/**
 * ```haskell
 * lift2 :: Apply f => (a -> b -> c) -> f a -> f b -> f c
 * ```
 *
 * Lifts a binary function to actions
 *
 * @category Apply
 * @since 1.0.0
 */
export const lift2: TC.Lift2F<[URI], V> = (f) => (fa) => (fb) =>
   _ap(
      _map(fa, (a) => (b) => f(a)(b)),
      fb
   );

/**
 * ```haskell
 * _mapBoth :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Applies both `Task`s and maps their results with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export const _mapBoth: TC.UC_MapBothF<[URI], V> = (fa, fb, f) => () =>
   Promise.all([fa(), fb()]).then(([a, b]) => f(a, b));

/**
 * ```haskell
 * mapBoth :: Apply f => (f b, ((a, b) -> c)) -> f a -> f c
 * ```
 *
 * Applies both `Task`s and maps their results with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapBoth: TC.MapBothF<[URI], V> = (fb, f) => (fa) => _mapBoth(fa, fb, f);

/**
 * ```haskell
 * _both :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Applies both `Task`s and collects their results into a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export const _both: TC.UC_BothF<[URI], V> = (fa, fb) => _mapBoth(fa, fb, (a, b) => [a, b]);

/**
 * ```haskell
 * both :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Applies both `Task`s and collects their results into a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export const both: TC.BothF<[URI], V> = (fb) => (fa) => _both(fa, fb);

/**
 * ```haskell
 * _chain :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const _chain: TC.UC_ChainF<[URI], V> = (ma, f) => () => ma().then((a) => f(a)());

/**
 * ```haskell
 * chain :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain: TC.ChainF<[URI], V> = (f) => (ma) => _chain(ma, f);

/**
 * ```haskell
 * bind :: Monad m => m a -> (a -> m b) -> m b
 * ```
 *
 * A version of `chain` where the arguments are flipped
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const bind: TC.BindF<[URI], V> = (ma) => (f) => _chain(ma, f);

/**
 * ```haskell
 * _tap :: Monad m => (ma, (a -> m b)) -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const _tap: TC.UC_TapF<[URI], V> = (ma, f) => _chain(ma, (a) => _map(f(a), () => a));

/**
 * ```haskell
 * tap :: Monad m => (a -> mb) -> m a -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap: TC.TapF<[URI], V> = (f) => (ma) => _tap(ma, f);

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `Task`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten: TC.FlattenF<[URI], V> = (mma) => _chain(mma, identity);

/**
 * ```haskell
 * _apSeq :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Sequentially apply a function to an argument under a type constructor. For a parallel version, see `_ap`
 *
 * @category Apply
 * @since 1.0.0
 */
export const _apSeq: TC.UC_ApF<[URI], V> = (fab, fa) => _chain(fab, (f) => _map(fa, f));

/**
 * ```haskell
 * apSeq :: Apply f => f a -> f (a -> b) -> f b
 * ```
 *
 * Sequentially apply a function to an argument under a type constructor. For a parallel version, see `ap`
 *
 * @category Apply
 * @since 1.0.0
 */
export const apSeq: TC.ApF<[URI], V> = (fa) => (fab) => _apSeq(fab, fa);

/**
 * ```haskell
 * _apFirstSeq :: Apply f => (f a, f b) -> f a
 * ```
 *
 * Sequentially combine two effectful actions, keeping only the result of the first. For a parallel version, see `_apFirst`
 *
 * @category Uncurried Apply
 * @since 1.0.0
 */
export const _apFirstSeq: TC.UC_ApFirstF<[URI], V> = (fa, fb) =>
   _apSeq(
      _map(fa, (a) => () => a),
      fb
   );

/**
 * ```haskell
 * apFirst :: Apply f => f b -> f a -> f a
 * ```
 *
 * Sequentially combine two effectful actions, keeping only the result of the first. For a parallel version, see `apFirst`
 *
 * @category Apply
 * @since 1.0.0
 */
export const apFirstSeq: TC.ApFirstF<[URI], V> = (fb) => (fa) => _apFirstSeq(fa, fb);

/**
 * ```haskell
 * _apSecondSeq :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Sequentially combine two effectful actions, keeping only the result of the second. For a parallel version, see `_apSecond`
 *
 * @category Apply
 * @since 1.0.0
 */
export const _apSecondSeq: TC.UC_ApSecondF<[URI], V> = <A, B>(fa: Task<A>, fb: Task<B>): Task<B> =>
   _apSeq(
      _map(fa, () => (b: B) => b),
      fb
   );

/**
 * ```haskell
 * apSecondSeq :: Apply f => f b -> f a -> f b
 * ```
 *
 * Sequentially combine two effectful actions, keeping only the result of the second. For a parallel version, see `apSecond`
 *
 * @category Apply
 * @since 1.0.0
 */
export const apSecondSeq: TC.ApSecondF<[URI], V> = (fb) => (fa) => _apSecondSeq(fa, fb);

/**
 * ```haskell
 * _mapBothSeq :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Sequentially applies both `Task`s and maps their results with function `f`. For a parallel version, see `_mapBoth`
 *
 * @category Apply
 * @since 1.0.0
 */
export const _mapBothSeq: TC.UC_MapBothF<[URI], V> = (fa, fb, f) => _chain(fa, (a) => _map(fb, (b) => f(a, b)));

/**
 * ```haskell
 * mapBoth :: Apply f => (f b, ((a, b) -> c)) -> f a -> f c
 * ```
 *
 * Sequentially applies both `Task`s and maps their results with function `f`. For a parallel version, see `mapBoth`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapBothSeq: TC.MapBothF<[URI], V> = (fb, f) => (fa) => _mapBothSeq(fa, fb, f);

/**
 * ```haskell
 * _bothSeq :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Sequentially applies both `Task`s and collects their results into a tuple. For a parallel version, see `_both`
 *
 * @category Apply
 * @since 1.0.0
 */
export const _bothSeq: TC.UC_BothF<[URI], V> = (fa, fb) => _mapBothSeq(fa, fb, (a, b) => [a, b]);

/**
 * ```haskell
 * bothSeq :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Sequentially applies both `Task`s and collects their results into a tuple. For a parallel version, see `both`
 *
 * @category Apply
 * @since 1.0.0
 */
export const bothSeq: TC.BothF<[URI], V> = (fb) => (fa) => _bothSeq(fa, fb);

/**
 * ```haskell
 * lift2Seq :: Apply f => (a -> b -> c) -> f a -> f b -> f c
 * ```
 *
 * Lifts a binary function to actions. `Task`s will be evaluated sequentially. For a parallel version, see `lift2`
 *
 * @category Apply
 * @since 1.0.0
 */
export const lift2Seq: TC.Lift2F<[URI], V> = (f) => (fa) => (fb) => _chain(fa, (a) => _map(fb, (b) => f(a)(b)));

/**
 * ```haskell
 * mapN :: Apply f => ([a, b, ...] -> c) -> [f a, f b, ...] -> f c
 * ```
 *
 * Combines a tuple of `Task`s and maps with provided function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapN: TC.MapNF<[URI], V> = (f) => (fas) => () => Promise.all(fas).then((as) => f(as as any));

/**
 * ```haskell
 * tuple :: Apply f => [f a, f b, ...] -> f [a, b, ...]
 * ```
 *
 * Combines a tuple of `Task`s and returns a `Task` of all arguments as a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export const tuple: TC.TupleF<[URI], V> = (fas) => () => Promise.all(fas) as any;

export const bindS: TC.BindSF<[URI], V> = (name, f) => chain((a) => _map(f(a), (b) => bind_(a, name, b)));

export const letS: TC.LetSF<[URI], V> = (name, f) => chain((a) => _map(pure(f(a)), (b) => bind_(a, name, b)));

export const bindToS: TC.BindToSF<[URI], V> = (name) => (fa) => _map(fa, bindTo_(name));

export const apS: TC.ApSF<[URI], V> = (name, fb) =>
   flow(
      map((a) => (b: InferA<typeof fb>) => bind_(a, name, b)),
      ap(fb)
   );
