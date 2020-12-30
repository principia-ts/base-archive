export const RURI = 'model/Result'

export type RURI = typeof RURI

interface Result<S, R, E, A> {
  build: (a: A) => A
}

declare module '../HKT' {
  interface URItoResult<S, R, E, A> {
    [RURI]: Result<S, R, E, A>
  }
}
