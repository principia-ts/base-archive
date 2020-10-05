export class NoSuchElementException extends Error {
   readonly _tag = "NoSuchElementException";
   constructor(method: string) {
      super(`${method}: No such element`);
   }
}
