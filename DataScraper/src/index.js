import Fastify from 'fastify'
import {loggerConfig} from './middleware/logger.js'

process.loadEnvFile()
const fastify = Fastify({logger: loggerConfig})
const hostname = process.env.HOST|| '127.0.0.1';
const port = 3000;


fastify.get('/hello', function (request, reply) {
    reply.code(200)
        .send({msg: 'hello worlds'})

})

fastify.route({
    method: 'GET',
    url: '/scrape',
    schema: {
        response: {
            200: {}
        }
    },
    preHandler: async function(req, res) {
        const clientKey = req.headers['x-api-key'];
        const serverKey = process.env.NODE_API_KEY;
        // 1. Block if the server is missing the key (prevents accidental open access)
        // 2. Block if the client didn't send a key
        // 3. Block if the keys don't match
        if (!serverKey || !clientKey || clientKey !== serverKey) {
            req.log.warn('invalid key')
            return res.status(401).send({ error: 'Unauthorized' });
        }
    },
    handler: function(req, res) {
        res.log.info('Scraper endpoint called successfully')
        res.send({hello: 'worlds'});
    }
})

// Run the server!
fastify.listen({port: 3000, host: hostname}, function (err, address) {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
    // Server is now listening on ${address}
})