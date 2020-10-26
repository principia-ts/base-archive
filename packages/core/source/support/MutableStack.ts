export class MutableStack<A> {
   #array: Array<A> = [];
   push = (value: A): void => {
      this.#array.push(value);
   };
   pop = (): A | undefined => this.#array.pop();
   peek = (): A | undefined => (this.#array.length > 0 ? this.#array[this.#array.length - 1] : undefined);
   get isEmpty(): boolean {
      return this.#array.length === 0;
   }
   get size(): number {
      return this.#array.length;
   }
}
