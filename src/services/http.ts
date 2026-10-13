export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function toApiError(response: Response, fallbackMessage: string) {
  let message = fallbackMessage;

  try {
    const data = await response.json();

    if (data && typeof data.error === "string" && data.error) {
      message = data.error;
    }
  } catch {
    message = fallbackMessage;
  }

  return new ApiError(message, response.status);
}

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message ? error.message : fallbackMessage;
}
