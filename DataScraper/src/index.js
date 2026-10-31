import Fastify from 'fastify'
import {getLoggerConfig} from './middleware/logger.js'
import {buildApp} from "./app.js";
import {EnviromentVariablesNotFoundException} from "./exceptions/enviromentVariablesNotFoundException.js";

try {
    process.loadEnvFile()
    
}
catch (e) {
    Fastify().log.fatal(e, 'Environment Variables could not be found')
    throw new EnviromentVariablesNotFoundException()
}


const loggerConfig = getLoggerConfig(process)
// const fastify = Fastify({logger: loggerConfig})
const hostname = process.env.NODE_HOST|| '0.0.0.0';
const port = 3000;


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

// Run the server!
const app = await buildApp({logger: loggerConfig})



app.listen({port: 3000, host: hostname}, () => app.log.info("live on http://" + hostname + ":" + port))