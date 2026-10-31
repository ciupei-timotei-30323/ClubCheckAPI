export function getLoggerConfig (NODE_ENV) {
    return {
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname'
            }
        },
        base: {
            env: NODE_ENV || 'development',
            app: 'scraper'


        },
        redact: {
            paths: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
            censor: '[HIDDEN]'
        }
    }
}
