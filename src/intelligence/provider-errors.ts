export class ProviderRequestError extends Error {
  readonly code: string;

  constructor(message: string, code = "PROVIDER_REQUEST_ERROR") {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class ProviderAuthenticationError extends ProviderRequestError {
  constructor(message = "provider authentication failed") {
    super(message, "PROVIDER_AUTHENTICATION_FAILED");
  }
}

export class ProviderUnavailableError extends ProviderRequestError {
  constructor(message = "provider is unavailable") {
    super(message, "PROVIDER_UNAVAILABLE");
  }
}

export class ProviderRateLimitError extends ProviderRequestError {
  constructor(message = "provider rate limit exceeded") {
    super(message, "PROVIDER_RATE_LIMITED");
  }
}
