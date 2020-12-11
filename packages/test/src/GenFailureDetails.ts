export interface GenFailureDetails {
  readonly initialInput: any;
  readonly shrunkenInput: any;
  readonly iterations: number;
}

export function GenFailureDetails<A>(
  initialInput: A,
  shrunkenInput: A,
  iterations: number
): GenFailureDetails {
  return {
    initialInput,
    shrunkenInput,
    iterations
  };
}
