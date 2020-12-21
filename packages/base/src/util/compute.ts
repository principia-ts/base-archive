/**
 * @hidden
 */
export type ComputeRaw<A extends any> = A extends Function
  ? A
  : {
      [K in keyof A]: A[K];
    } & {};

/**
 * @hidden
 */
export type ComputeFlat<A extends any> = A extends BuiltInObject
  ? A
  : {
      [K in keyof A]: A[K];
    } & {};

/**
 * @hidden
 */
export type ComputeDeep<A extends any> = A extends BuiltInObject
  ? A
  : {
      [K in keyof A]: ComputeDeep<A[K]>;
    } & {};

/**
 * Force TS to load a type that has not been computed (to resolve composed
 * types that TS haven't fully resolved, for display purposes mostly).
 * @param A to compute
 * @returns `A`
 * @example
 * ```ts
 * import {A} from 'ts-toolbelt'
 *
 * type test0 = A.Compute<{x: 'x'} & {y: 'y'}> // {x: 'x', y: 'y'}
 * ```
 */
export type Compute<A extends any, depth extends Depth = "deep"> = {
  flat: ComputeFlat<A>;
  deep: ComputeDeep<A>;
}[depth];

type Depth = "flat" | "deep";

/**
 * @hidden
 */
type Errors = Error;
// | EvalError
// | RangeError
// | ReferenceError
// | SyntaxError
// | TypeError
// | URIError

/**
 * @hidden
 */
type Numeric =
  // | Number
  // | BigInt // not needed
  // | Math
  Date;

/**
 * @hidden
 */
type Textual =
  // | String
  RegExp;

/**
 * @hidden
 */
type Arrays =
  // | Array<unknown>
  // | ReadonlyArray<unknown>
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;
// | BigInt64Array
// | BigUint64Array

/**
 * @hidden
 */
type Maps =
  // | Map<unknown, unknown>
  // | Set<unknown>
  ReadonlyMap<unknown, unknown> | ReadonlySet<unknown> | WeakMap<object, unknown> | WeakSet<object>;

/**
 * @hidden
 */
type Structures =
  | ArrayBuffer
  // | SharedArrayBuffer
  // | Atomics
  | DataView;
// | JSON

/**
 * @hidden
 */
type Abstractions = Function | Promise<unknown> | Generator;
// | GeneratorFunction

/**
 * @hidden
 */
type WebAssembly = never;

/**
 * Built-in standard library objects
 */
export type BuiltInObject =
  | Errors
  | Numeric
  | Textual
  | Arrays
  | Maps
  | Structures
  | Abstractions
  | WebAssembly;
