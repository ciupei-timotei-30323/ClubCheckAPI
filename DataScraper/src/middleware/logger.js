const isDevelopment = process.env.NODE_ENV !== 'production'
export const loggerConfig = {
    level: process.env.LOG_LEVEL || 'info',
    transport: isDevelopment
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' } }
        : undefined,
    base: {
        env: process.env.NODE_ENV || 'development',
        app: 'scraper'
    },
    redact: {
        paths: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
        censor: '[HIDDEN]'
    }
}