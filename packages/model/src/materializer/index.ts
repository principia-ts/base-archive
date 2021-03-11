export const RURI = 'model/Result'

export type RURI = typeof RURI

interface Result<E, A> {
  build: (a: A) => A
}

declare module '../HKT' {
  interface URItoResult<E, A> {
    [RURI]: Result<E, A>
  }
}
