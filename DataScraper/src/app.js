import Fastify from 'fastify'
import {errorHandler} from "./middleware/errorHandler.js";
import {helloRoute} from "./api/helloRoute.js";

export async function buildApp(opts) {
    
    const app = Fastify(opts)
    app.log.info("Registering Error Handler")
    
    app.setErrorHandler(errorHandler)
    // Register routes
    app.log.info("Registering Routes")
    
    await app.register(helloRoute)
    
    return app
}