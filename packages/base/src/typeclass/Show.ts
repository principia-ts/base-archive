export interface Show<A> {
  readonly show: (a: A) => string
}

export function makeShow<A>(show: (a: A) => string): Show<A> {
  return {
    show
  }
}
