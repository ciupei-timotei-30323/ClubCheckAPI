import Fastify from 'fastify'
import {errorHandler} from "./middleware/errorHandler.js";
import {helloRoute} from "./api/helloRoute.js";
import {scrapeRoute} from "./api/scrapeRoute.js";

export async function buildApp(opts) {
    
    const app = Fastify(opts)
    app.log.info("Registering Error Handler")
    
    app.setErrorHandler(errorHandler)
    // Register routes
    app.log.info("Registering Routes")
    
    await app.register(helloRoute)
    await app.register(scrapeRoute, {apiKey: opts.apiKey})
    return app
}