export class ApiHttpException extends Error {
  constructor(public readonly message: string, public readonly status: number, public readonly cause?: unknown) {
    super(message);
  }
}
