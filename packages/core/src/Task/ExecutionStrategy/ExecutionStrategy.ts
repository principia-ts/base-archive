export interface Sequential {
  readonly _tag: "Sequential";
}

export interface Parallel {
  readonly _tag: "Parallel";
}

export interface ParallelN {
  readonly _tag: "ParallelN";
  readonly n: number;
}

export function sequential(): Sequential {
  return {
    _tag: "Sequential"
  };
}

export function parallel(): Parallel {
  return {
    _tag: "Parallel"
  };
}

export function parallelN(n: number): ParallelN {
  return {
    _tag: "ParallelN",
    n
  };
}

export type ExecutionStrategy = Sequential | Parallel | ParallelN;
