import { Supervisor } from "@principia/core/IO/Supervisor";

export class TestTimeoutException extends Error {
  constructor(message: string) {
    super(message);
  }
}
