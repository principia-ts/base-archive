export class MutableStack<A> {
  private array: Array<A> = [];
  push(value: A): void {
    this.array.push(value);
  }
  pop(): A | undefined {
    return this.array.pop();
  }
  peek(): A | undefined {
    return this.array.length > 0 ? this.array[this.array.length - 1] : undefined;
  }
  get isEmpty(): boolean {
    return this.array.length === 0;
  }
  get size(): number {
    return this.array.length;
  }
}
