export const $equals = Symbol.for('$equals')

export interface Equatable {
  [$equals](that: any): boolean
}
