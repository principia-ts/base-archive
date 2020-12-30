export class PrematureGeneratorExit extends Error {
  readonly _tag = 'PrematureGeneratorExit'
  constructor(method: string) {
    super(
      `Error: ${method}. Replaying values resulted in a premature end of the generator execution. Ensure that the generator is pure and that effects are performed only by yielding.`
    )
    this.name = this.constructor.name
  }
}
