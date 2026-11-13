import {scrapeService} from "../services/scrapeService.js";

export async function scrapeRoute(app, {apiKey, pool, queue}) {
    app.route({
    method: 'GET',
    url: '/scrape',
    schema: {
        response: {
            202: {}
        }
    },
    preHandler: async function(req, res) {
        const clientKey = req.headers['x-api-key'];
        const serverKey = apiKey;

        if (!serverKey || !clientKey || clientKey !== serverKey) {
            res.log.warn('invalid key')
            return res.status(404).send("Page Not Found")
        }
    },
    handler: async function(req, res) {
        res.log.info('Scraper endpoint called successfully')
        const result = await scrapeService({ pool, queue, logger: res.log })
        return await res.status(result.status).send(result.msg)
    }
})
    
    
}