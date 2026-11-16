export type ApiResult<T> =
  | { status: "ok"; data: T }
  | { status: "empty"; data?: T }
  | { status: "error"; message: string; statusCode?: number }
