export const $equals = Symbol.for('$equals')

export interface Equatable {
  [$equals](other: any): boolean
}
