export const $hash = Symbol.for('@@hash')

export interface Hashable {
  [$hash](): number
}

export function isHashable(value: any): value is Hashable {
  return $hash in value
}
