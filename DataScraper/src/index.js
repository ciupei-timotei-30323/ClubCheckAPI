import {getLoggerConfig} from './middleware/logger.js'
import {buildApp} from "./app.js";

// This  block of code doesn't matter for containers
//----------------------------------------------------------------------------------------------------
try {                                                                                              // |
    process.loadEnvFile('../.env')                                                            // |
}                                                                                                  // |
catch (e) {                                                                                        // |
    console.log('[Environment Variables could not be found in the environment file provided]\n')   // |
    console.log({e})                                                                               // |
}                                                                                                  // | 
// ----------------------------------------------------------------------------------------------------


// const fastify = Fastify({logger: loggerConfig})
const enviroment = process.env.NODE_ENV || 'production'
const loggerConfig = getLoggerConfig({enviroment})
const hostname = process.env.NODE_HOST|| '0.0.0.0';
const port =  process.env.NODE_PORT || 3000;
const serverKey = process.env.NODE_API_KEY || ''



// fastify.route({
//     method: 'GET',
//     url: '/scrape',
//     schema: {
//         response: {
//             200: {}
//         }
//     },
//     preHandler: async function(req, res) {
//         const clientKey = req.headers['x-api-key'];
//         const serverKey = process.env.NODE_API_KEY;
//
//         if (!serverKey || !clientKey || clientKey !== serverKey) {
//             req.log.warn('invalid key')
//             throw NotFound();
//         }
//     },
//     handler: function(req, res) {
//         res.log.info('Scraper endpoint called successfully')
//         res.send({hello: 'worlds'});
//     }
// })

// Build the app
const app = await buildApp({logger: loggerConfig, apiKey: serverKey})

// Run the server!
app.listen({port: port, host: hostname}, () => app.log.info("live on http://" + hostname + ":" + port))