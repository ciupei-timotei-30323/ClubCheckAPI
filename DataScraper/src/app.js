import Fastify from 'fastify'
import {errorHandler} from "./middleware/errorHandler.js";
import {helloRoute} from "./api/helloRoute.js";
import {scrapeRoute} from "./api/scrapeRoute.js";
import {getPool} from "./config/database.js";
import { setDefaultBackendFactory, createPostgresBackend, Queue } from 'bullmq';
import { SCRAPE_QUEUE_NAME } from "./config/queue.js";

export async function buildApp(opts) {
    
    // Get pooled connection to DB
    
    const app = Fastify(opts)


        

    app.log.info("Registering Error Handler")
    
    app.setErrorHandler(errorHandler)

    app.log.info("Connecting to the database")
    let pool = await getPool({connString: opts.connString})
    app.log.info(pool.msg)
    
    //Set BullMQ default backend as Postgres
    setDefaultBackendFactory(createPostgresBackend)

    // The queue connection is injected by the composition root. Wrapping a
    // connection string lets BullMQ run its own schema migrations on startup.
    const queueConnection = typeof (opts.queueConnection ?? opts.connString) === 'string'
        ? { connectionString: opts.queueConnection ?? opts.connString, migrate: true }
        : (opts.queueConnection ?? opts.connString ?? { migrate: true })

    app.log.info("Creating scrape queue")
    const queue = new Queue(SCRAPE_QUEUE_NAME, {
        connection: queueConnection,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: { age: 86_400, count: 1_000 },
            removeOnFail: { age: 604_800 }
        }
    })

    app.addHook('onClose', async () => {
        app.log.info('Closing scrape queue')
        await queue.close()
    })

    
    // Register routes
    app.log.info("Registering Routes")
    
    await app.register(helloRoute)
    await app.register(scrapeRoute, {apiKey: opts.apiKey, pool: pool.pool, queue})
    return app
}