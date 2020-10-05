import { FunctionN } from "../Function";

export class SerializableError<I> extends Error {
   readonly stacktrace: ReadonlyArray<string>;
   readonly stack!: string;
   constructor(
      readonly code: string,
      readonly message: string,
      readonly id: string,
      readonly info: I,
      caller?: FunctionN<ReadonlyArray<any>, any>,
      readonly userMessage?: string,
      readonly timestamp: Date = new Date()
   ) {
      super(message);

      /*
       * Use Object.defineProperty to make the usually unenumerable properties
       * of Error enumerable
       */
      Object.defineProperty(this, "name", {
         enumerable: true,
         value: this.constructor.name
      });
      Object.defineProperty(this, "message", {
         enumerable: true,
         value: message
      });

      /*
       * Adjust the stacktrace to start at the caller
       */
      caller && Error.captureStackTrace(this, caller);
      Object.defineProperty(this, "stack", {
         enumerable: true,
         value: this.stack
      });

      this.stacktrace = this.stack.split("\n");
      this.userMessage = userMessage ?? message;
   }
}

export interface SerializedError<I> {
   readonly code: string;
   readonly message: string;
   readonly name: string;
   readonly timestamp: Date;
   readonly id: string;
   readonly info: I;
}

export const serialize = <I>(err: SerializableError<I>): SerializedError<I> => ({
   code: err.code,
   message: err.userMessage ?? err.message,
   name: err.name,
   timestamp: err.timestamp,
   id: err.id,
   info: err.info
});
