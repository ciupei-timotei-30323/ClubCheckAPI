export function getLoggerConfig() {
    const env = String(process.env.NODE_ENV ?? 'development').trim().toLowerCase();
    const isProd = env === 'production' || env === 'prod';

    return {
        level: 'info',
        ...(!isProd && {
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