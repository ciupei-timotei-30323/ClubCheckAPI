export function getLoggerConfig(NODE_ENV) {
    const env = NODE_ENV || 'development';
    const isDev = env === 'development';

    return {
        level: 'info',
        ...(isDev && {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname'
                }
            }
        }),
        base: {
            env,
            app: 'scraper'
        },
        redact: {
            paths: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
            censor: '[HIDDEN]'
        }
    };
}