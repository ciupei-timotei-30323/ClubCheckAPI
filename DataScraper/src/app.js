import Fastify from 'fastify'
import {errorHandler} from "./middleware/errorHandler.js";
import {helloRoute} from "./api/helloRoute.js";
import {scrapeRoute} from "./api/scrapeRoute.js";
import {getPool} from "./config/database.js";


export async function buildApp(opts) {
    
    // Get pooled connection to DB
    
    const app = Fastify(opts)

    app.log.info("Connecting to the database")
    let pool = await getPool({connString: opts.connString})
    app.log.info(pool.msg)
        

    app.log.info("Registering Error Handler")
    
    app.setErrorHandler(errorHandler)
    
    // Register routes
    app.log.info("Registering Routes")
    
    await app.register(helloRoute)
    await app.register(scrapeRoute, {apiKey: opts.apiKey, pool: pool.pool})
    return app
}