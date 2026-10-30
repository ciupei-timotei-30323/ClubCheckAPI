import Fastify from 'fastify'
import { loggerConfig } from './middleware/logger.js'
import express from 'express'


const fastify = Fastify({ logger: loggerConfig })
const app = express()
const hostname = '0.0.0.0';
const port = 3000;

app.listen(port, hostname,
    () => {
        fastify.log.info("listening on http://" + hostname + ":" + port)
    })

app.get('/', (req, res) => {
    res.send('Hello Worlds!'),
        fastify.log.info('Endpoint hit'),
        res.status(200)
})