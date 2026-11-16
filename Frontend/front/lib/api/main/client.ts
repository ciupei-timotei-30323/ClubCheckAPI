import type { ApiResult } from "./result"

const DEFAULT_BASE_URL = "https://clubcheck-api.whiteflower-b7c64b18.italynorth.azurecontainerapps.io"

const API_BASE_URL = (
  process.env.MAIN_API_BASE_URL ?? DEFAULT_BASE_URL
).replace(/\/+$/, "")

type ApiFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] }
  notFoundIsEmpty?: boolean
}

export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit = {}
): Promise<ApiResult<T>> {
  const { notFoundIsEmpty = false, ...requestInit } = init
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`

  try {
    const response = await fetch(url, {
      ...requestInit,
      signal: requestInit.signal ?? AbortSignal.timeout(10_000),
    })

    if (response.status === 404 && notFoundIsEmpty) {
      return { status: "empty" }
    }

    if (!response.ok) {
      const detail = await readProblemDetail(response)

      return {
        status: "error",
        statusCode: response.status,
        message: detail ?? response.statusText,
      }
    }

    return { status: "ok", data: (await response.json()) as T }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown API error",
    }
  }
}

async function readProblemDetail(response: Response): Promise<string | undefined> {
  try {
    const problem = (await response.json()) as {
      detail?: unknown
      title?: unknown
    }

    if (typeof problem.detail === "string" && problem.detail) {
      return problem.detail
    }

    if (typeof problem.title === "string" && problem.title) {
      return problem.title
    }
  } catch {
    // Ignore non-JSON error bodies.
  }

  return undefined
}
