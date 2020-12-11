export interface Failure {
  readonly _tag: "Failure";
  readonly exception: Error;
}

export interface Success<A> {
  readonly _tag: "Success";
  readonly value: A;
}

export type Try<A> = Success<A> | Failure;

export const URI = "Try";
export type URI = typeof URI;
