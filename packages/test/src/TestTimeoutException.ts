import { Supervisor } from '@principia/io/Supervisor'

export class TestTimeoutException extends Error {
  constructor(message: string) {
    super(message)
  }
}
