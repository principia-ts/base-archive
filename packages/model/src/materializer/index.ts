export const RURI = 'model/Result'

export type RURI = typeof RURI

interface Result<I, E, A, O> {
  build: (a: A) => A
}

declare module '../HKT' {
  interface URItoResult<I, E, A, O> {
    [RURI]: Result<I, E, A, O>
  }
}
