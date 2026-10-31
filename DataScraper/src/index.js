import Fastify from 'fastify'
import {loggerConfig} from './middleware/logger.js'


const fastify = Fastify({logger: loggerConfig})
const hostname = '127.0.0.1';
const port = 3000;

fastify.get('/hello', function (request, reply) {
    reply.code(200)
        .send({msg: 'hello worlds'})

})

// Run the server!
fastify.listen({port: 3000, host: hostname}, function (err, address) {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
    // Server is now listening on ${address}
})