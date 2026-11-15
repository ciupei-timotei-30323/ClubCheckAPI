import Fastify from 'fastify'
import {errorHandler} from "./middleware/errorHandler.js";
import {helloRoute} from "./api/helloRoute.js";
import {scrapeRoute} from "./api/scrapeRoute.js";
import {getPool} from "./config/database.js";
import { setDefaultBackendFactory, createPostgresBackend, Queue } from 'bullmq';
import { API_QUEUE_NAME, SCRAPE_QUEUE_NAME } from "./config/queue.js";

export async function buildApp(opts) {
    
    // Get pooled connection to DB
    
    const app = Fastify(opts)


        

    app.log.info("Registering Error Handler")
    
    app.setErrorHandler(errorHandler)

    app.log.info("Connecting to the database")
    let pool = await getPool({connString: opts.connString})
    app.decorate('dbPool', pool.pool)
    app.log.info(pool.msg)
    
    //Set BullMQ default backend as Postgres
    setDefaultBackendFactory(createPostgresBackend)

    // BullMQ's PostgreSQL backend adds a `search_path` startup option, which
    // Neon's pooled endpoint rejects. Use an unpooled connection for queues and
    // keep the pooled connection for regular application queries.
    const queueConnection = typeof (opts.queueConnection ?? opts.connString) === 'string'
        ? { connectionString: opts.queueConnection ?? opts.connString, migrate: true }
        : (opts.queueConnection ?? opts.connString ?? { migrate: true })

    const queueOptions = {
        connection: queueConnection,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: { age: 86_400, count: 1_000 },
            removeOnFail: { age: 604_800 }
        }
    }

    app.log.info("Creating scrape and API queues")
    const scrapeQueue = new Queue(SCRAPE_QUEUE_NAME, queueOptions)
    const apiQueue = new Queue(API_QUEUE_NAME, queueOptions)

    app.addHook('onClose', async () => {
        app.log.info('Closing queues')
        await Promise.all([scrapeQueue.close(), apiQueue.close()])
        app.log.info('Closing database pool')
        await pool.pool.end()
    })

    
    // Register routes
    app.log.info("Registering Routes")
    
    await app.register(helloRoute)
    await app.register(scrapeRoute, {
        apiKey: opts.apiKey,
        pool: pool.pool,
        scrapeQueue,
        apiQueue
    })
    return app
}