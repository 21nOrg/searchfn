export class StorageError extends Error {
  cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "StorageError";
    if (Object.prototype.hasOwnProperty.call(options ?? {}, "cause")) {
      this.cause = options?.cause;
    }
  }
}
