export function getLoggerConfig (process) {
    if(process == null){
        console.log("No Enviroment Variables found")
        return null
    }
    return {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname'
            }
        },
        base: {
            env: process.env.NODE_ENV || 'development',
            app: 'scraper'


        },
        redact: {
            paths: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
            censor: '[HIDDEN]'
        }
    }
}
