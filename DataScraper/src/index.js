import axios from 'axios'
import {GoogleGenAI} from '@google/genai'
import {getLoggerConfig} from './middleware/logger.js'
import {buildApp} from "./app.js";
import {createScrapeWorker} from "./workers/scrapeWorker.js";
import {SCRAPE_QUEUE_NAME} from "./config/queue.js";
import {createStructuredDataExtractor} from "./inferences/structuredDataInference.js";
import {createScrapeIngestionPipeline} from "./services/scrapeIngestionPipeline.js";
import {createEventIngestionService} from "./services/eventIngestionService.js";
import {createArtistFingerprintService} from "./services/artistFingerprintService.js";
import {createClubCheckApiClient} from "./clients/clubCheckApiClient.js";
import {createMusicBrainzClient} from "./clients/musicBrainzClient.js";
import {createRateLimiter} from "./utils/rateLimiter.js";

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
const connectionString = process.env.NODE_DATABASE_URL_POOLED || ''
const scraperApiUrl = process.env.NODE_SCRAPER_API_URL || ''
const scrapingApiKey = process.env.SCRAPING_API_KEY || ''
const scraperTimeoutMs = Number(process.env.NODE_SCRAPER_API_TIMEOUT_MS || 30_000)
const scraperConcurrency = Number(process.env.NODE_SCRAPER_CONCURRENCY || 5)
const geminiApiKey = process.env.GEMINI_API_KEY || ''
const geminiModel = process.env.GEMINI_MODEL || 'gemini-4-hydrogen'
const clubCheckApiUrl = process.env.NODE_CLUBCHECK_API_URL || ''
const clubCheckApiKey = process.env.NODE_CLUBCHECK_API_KEY || process.env.NODE_API_KEY || ''
const musicBrainzApiUrl = process.env.MUSICBRAINZ_API_URL || 'https://musicbrainz.org/ws/2'
const musicBrainzUserAgent = process.env.MUSICBRAINZ_USER_AGENT || 'ClubCheckAPI-DataScraper/1.0.0'
const musicBrainzMinIntervalMs = Number(process.env.MUSICBRAINZ_MIN_INTERVAL_MS || 1_100)
const musicBrainzIncludes = process.env.MUSICBRAINZ_INCLUDES || undefined


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
const app = await buildApp({logger: loggerConfig, apiKey: serverKey, connString: connectionString})

// Run the worker in the same process as the API. The worker and the queue
// share the same BullMQ connection configuration; both are injected so the
// worker module never reads process.env directly.
if (scraperApiUrl) {
    let onScraped

    if (geminiApiKey) {
        const ai = new GoogleGenAI({apiKey: geminiApiKey})
        const extractor = createStructuredDataExtractor({
            ai,
            model: geminiModel,
            logger: app.log
        })

        app.log.info({model: geminiModel}, 'Gemini structured-data extraction enabled')

        if (clubCheckApiUrl && clubCheckApiKey) {
            const musicBrainzRateLimiter = createRateLimiter({
                minIntervalMs: musicBrainzMinIntervalMs,
                logger: app.log
            })
            const musicBrainzClient = createMusicBrainzClient({
                httpClient: axios,
                baseUrl: musicBrainzApiUrl,
                userAgent: musicBrainzUserAgent,
                rateLimiter: musicBrainzRateLimiter,
                logger: app.log,
                includes: musicBrainzIncludes
            })
            const artistFingerprintService = createArtistFingerprintService({
                musicBrainzClient,
                logger: app.log
            })
            const clubCheckApiClient = createClubCheckApiClient({
                httpClient: axios,
                baseUrl: clubCheckApiUrl,
                apiKey: clubCheckApiKey,
                logger: app.log
            })
            const eventIngestionService = createEventIngestionService({
                clubCheckApiClient,
                artistFingerprintService,
                logger: app.log
            })

            onScraped = createScrapeIngestionPipeline({
                structuredDataExtractor: extractor,
                eventIngestionService,
                logger: app.log
            })

            if (!process.env.MUSICBRAINZ_USER_AGENT) {
                app.log.warn(
                    'MUSICBRAINZ_USER_AGENT is not set; configure a valid app name and contact email'
                )
            }

            app.log.info(
                {
                    clubCheckApiUrl,
                    musicBrainzApiUrl,
                    musicBrainzMinIntervalMs
                },
                'ClubCheckAPI ingestion pipeline enabled'
            )
        } else {
            app.log.warn(
                'NODE_CLUBCHECK_API_URL or NODE_CLUBCHECK_API_KEY is not set; only structured extraction will run'
            )
            onScraped = async ({url, text, job}) => {
                await job.updateProgress({stage: 'inferring', percent: 92})
                const inference = await extractor.extract({text, sourceUrl: url})
                await job.updateProgress({stage: 'inferred', percent: 98})
                return inference
            }
        }
    } else {
        app.log.warn('GEMINI_API_KEY is not set; scraped text will not be sent to Gemini')
    }

    const scrapeWorker = createScrapeWorker({
        connection: connectionString
            ? {connectionString, migrate: true}
            : {migrate: true},
        queueName: SCRAPE_QUEUE_NAME,
        scraperApiUrl,
        scrapingApiKey,
        logger: app.log,
        httpClient: axios,
        concurrency: scraperConcurrency,
        timeoutMs: scraperTimeoutMs,
        onScraped
    })

    app.addHook('onClose', async () => {
        app.log.info('Closing scrape worker')
        await scrapeWorker.close()
    })

    if (!scrapingApiKey) {
        app.log.warn('SCRAPING_API_KEY is not set; scraping API requests will be sent without a key')
    }

    app.log.info(
        {
            concurrency: scraperConcurrency,
            timeoutMs: scraperTimeoutMs,
            hasApiKey: Boolean(scrapingApiKey)
        },
        'Scrape worker started'
    )
} else {
    app.log.warn('NODE_SCRAPER_API_URL is not set; scrape worker will not start')
}

// Run the server!
await app.listen({port: port, host: hostname})
app.log.info("live on http://" + hostname + ":" + port)

// Close the Fastify app (and therefore the queue and worker) gracefully.
async function shutdown(signal) {
    app.log.info({signal}, 'Shutting down')
    try {
        await app.close()
        process.exit(0)
    } catch (error) {
        app.log.error({err: error}, 'Graceful shutdown failed')
        process.exit(1)
    }
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))