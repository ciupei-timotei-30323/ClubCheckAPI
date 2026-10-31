
export function errorHandler(error, request, reply) {
    const statusCode = error.statusCode ?? 500

    // Log at the right level: 5xx are your bugs, 4xx are client mistakes
    if (statusCode >= 500) {
        request.log.error({ err: error }, 'Unhandled error')
    } else {
        request.log.warn({ err: error }, error.message)
    }

    const body = {
        type: 'about:blank',
        title: statusCode >= 500 ? 'Internal Server Error' : error.name,
        status: statusCode,
        code: error.code,
        // Never leak internals on 5xx
        detail: statusCode >= 500 ? 'An unexpected error occurred.' : error.message,
        instance: request.url,
        traceId: request.id // matches the request id in your logs
    }

    if (error.validation) {
        body.status = 400
        body.title = 'Validation failed'
        body.errors = error.validation.map((v) => ({
            field: v.instancePath || v.params?.missingProperty,
            message: v.message
        }))
    }

    return reply
        .status(body.status)
        .type('application/problem+json')
        .send(body)
}