/**
 * Domain error with an associated HTTP status code.
 * Services throw these; the router maps them to HTTP responses.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}
