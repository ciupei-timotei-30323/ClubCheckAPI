import axios from 'axios'
import {GoogleGenAI} from '@google/genai'
import {Groq} from 'groq-sdk'
import {getLoggerConfig} from './middleware/logger.js'
import {buildApp} from "./app.js";
import {createScrapeWorker} from "./workers/scrapeWorker.js";
import {SCRAPE_QUEUE_NAME} from "./config/queue.js";
import {createStructuredDataExtractor} from "./inferences/structuredDataInference.js";
import {createGroqClassificationService} from "./inferences/groqClassification.js";
import {createScrapeIngestionPipeline} from "./services/scrapeIngestionPipeline.js";
import {createEventIngestionService} from "./services/eventIngestionService.js";
import {createArtistFingerprintService} from "./services/artistFingerprintService.js";
import {createSourceScrapeService} from "./services/sourceScrapeService.js";
import {createClubCheckApiClient} from "./clients/clubCheckApiClient.js";
import {createMusicBrainzClient} from "./clients/musicBrainzClient.js";
import {createScraperApiClient} from "./clients/scraperApiClient.js";
import {createPageRepository} from "./repositories/pageRepository.js";
import {createRateLimiter} from "./utils/rateLimiter.js";
import {createTokensPerMinuteLimiter} from "./utils/tokensPerMinuteLimiter.js";

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


const enviroment = process.env.NODE_ENV || 'production'
const loggerConfig = getLoggerConfig({enviroment})
const hostname = process.env.NODE_HOST || '0.0.0.0';
const port = process.env.NODE_PORT || 3000;
const serverKey = process.env.NODE_API_KEY || ''
const connectionString = process.env.NODE_DATABASE_URL_POOLED || ''
const queueConnectionString = process.env.NODE_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || connectionString

const scraperApiUrl = process.env.NODE_SCRAPER_API_URL || ''
const scraperUsername = process.env.SCRAPER_USERNAME || ''
const scraperPassword = process.env.SCRAPER_PASSWORD || ''
const scraperTimeoutMs = Number(process.env.NODE_SCRAPER_API_TIMEOUT_MS || 60_000)
const firecrawlTimeoutMs = Number(process.env.NODE_FIRECRAWL_TIMEOUT_MS || 30_000)
const firecrawlLlmTimeoutMs = Number(process.env.NODE_FIRECRAWL_LLM_TIMEOUT_MS || 180_000)
const scraperMaxRetries = Number(process.env.NODE_SCRAPER_API_MAX_RETRIES || 1)
const scraperRetryDelayMs = Number(process.env.NODE_SCRAPER_API_RETRY_DELAY_MS || 2_000)
const scraperConcurrency = Number(process.env.NODE_SCRAPER_CONCURRENCY || 5)

const groqApiKey = process.env.GROQ_API_KEY || ''
const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
const groqTpmLimit = Number(process.env.GROQ_TPM_LIMIT || 8_000)

const geminiApiKey = process.env.GEMINI_API_KEY || ''
const geminiModel = process.env.GEMINI_MODEL || 'gemini-4-hydrogen'
const clubCheckApiUrl = process.env.NODE_CLUBCHECK_API_URL || ''
const clubCheckApiKey = process.env.NODE_CLUBCHECK_API_KEY || process.env.NODE_API_KEY || ''
const clubCheckPostIntervalMs = Number(process.env.NODE_CLUBCHECK_POST_INTERVAL_MS || 60_000)
const musicBrainzApiUrl = process.env.MUSICBRAINZ_API_URL || 'https://musicbrainz.org/ws/2'
const musicBrainzUserAgent = process.env.MUSICBRAINZ_USER_AGENT || 'ClubCheckAPI-DataScraper/1.0.0'
const musicBrainzMinIntervalMs = Number(process.env.MUSICBRAINZ_MIN_INTERVAL_MS || 1_100)
const musicBrainzIncludes = process.env.MUSICBRAINZ_INCLUDES || undefined

// Build the app
const app = await buildApp({
    logger: loggerConfig,
    apiKey: serverKey,
    connString: connectionString,
    queueConnection: queueConnectionString
})

// Downstream handler invoked only for pages Groq classified as music-related.
let onMusicEvent

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
        const clubCheckPostRateLimiter = createRateLimiter({
            minIntervalMs: clubCheckPostIntervalMs,
            logger: app.log
        })
        const clubCheckApiClient = createClubCheckApiClient({
            httpClient: axios,
            baseUrl: clubCheckApiUrl,
            apiKey: clubCheckApiKey,
            logger: app.log,
            rateLimiter: clubCheckPostRateLimiter
        })
        const eventIngestionService = createEventIngestionService({
            clubCheckApiClient,
            artistFingerprintService,
            logger: app.log
        })

        onMusicEvent = createScrapeIngestionPipeline({
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
                clubCheckPostIntervalMs,
                musicBrainzApiUrl,
                musicBrainzMinIntervalMs
            },
            'ClubCheckAPI ingestion pipeline enabled'
        )
    } else {
        app.log.warn(
            'NODE_CLUBCHECK_API_URL or NODE_CLUBCHECK_API_KEY is not set; only structured extraction will run'
        )
        onMusicEvent = async ({url, text, metadata, job, onProgress}) => {
            const updateProgress = onProgress ?? (progress => job.updateProgress(progress))
            await updateProgress({stage: 'inferring', percent: 92})
            const inference = await extractor.extract({text, sourceUrl: url, metadata})
            await updateProgress({stage: 'inferred', percent: 99})
            return inference
        }
    }
} else {
    app.log.warn('GEMINI_API_KEY is not set; music pages will not be sent to Gemini')
}

// Source scraping worker: discovery -> dedupe -> /scrape -> Groq classification.
if (scraperApiUrl && scraperUsername && scraperPassword && groqApiKey) {
    const scraperApiClient = createScraperApiClient({
        httpClient: axios,
        baseUrl: scraperApiUrl,
        username: scraperUsername,
        password: scraperPassword,
        logger: app.log,
        timeoutMs: scraperTimeoutMs,
        scrapeTimeoutMs: firecrawlTimeoutMs,
        classificationTimeoutMs: firecrawlLlmTimeoutMs,
        maxRetries: scraperMaxRetries,
        retryDelayMs: scraperRetryDelayMs
    })
    const groqClient = new Groq({apiKey: groqApiKey})
    const groqTokensPerMinuteLimiter = createTokensPerMinuteLimiter({
        limit: groqTpmLimit,
        windowMs: 60_000,
        logger: app.log
    })
    const groqClassificationService = createGroqClassificationService({
        groqClient,
        logger: app.log,
        tokensPerMinuteLimiter: groqTokensPerMinuteLimiter,
        model: groqModel
    })
    const pageRepository = createPageRepository({
        pool: app.dbPool,
        logger: app.log
    })
    const sourceScrapeService = createSourceScrapeService({
        scraperApiClient,
        groqClassificationService,
        pageRepository,
        logger: app.log
    })

    const scrapeWorker = createScrapeWorker({
        connection: queueConnectionString
            ? {connectionString: queueConnectionString, migrate: true}
            : {migrate: true},
        queueName: SCRAPE_QUEUE_NAME,
        sourceScrapeService,
        onMusicEvent,
        logger: app.log,
        concurrency: scraperConcurrency
    })

    app.addHook('onClose', async () => {
        app.log.info('Closing scrape worker')
        await scrapeWorker.close()
    })

    app.log.info(
        {
            concurrency: scraperConcurrency,
            timeoutMs: scraperTimeoutMs,
            firecrawlTimeoutMs,
            firecrawlLlmTimeoutMs,
            maxRetries: scraperMaxRetries,
            retryDelayMs: scraperRetryDelayMs,
            groqModel,
            groqTpmLimit
        },
        'Source scrape worker started'
    )
} else {
    const missing = [
        !scraperApiUrl && 'NODE_SCRAPER_API_URL',
        !scraperUsername && 'SCRAPER_USERNAME',
        !scraperPassword && 'SCRAPER_PASSWORD',
        !groqApiKey && 'GROQ_API_KEY'
    ].filter(Boolean)

    app.log.warn(
        {missing},
        'Scrape worker not started because required configuration is missing'
    )
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
