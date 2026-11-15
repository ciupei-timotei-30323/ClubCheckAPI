import {
    extractEmbeddedClassification,
    extractLinks,
    extractPageMetadata,
    extractScrapedText,
    normalizeDiscoveredLinks
} from '../utils/scraperPayload.js'

const MAX_PAGE_URL_LENGTH = 2_000

function normalizedHost(value) {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    return url.port ? `${hostname}:${url.port}` : hostname
}

function isSameSourceBase(link, sourceUrl) {
    try {
        return normalizedHost(link) === normalizedHost(sourceUrl)
    } catch {
        return false
    }
}

function isSourcePage(link, sourceUrl) {
    try {
        const candidate = new URL(link)
        const source = new URL(sourceUrl)

        if (normalizedHost(link) !== normalizedHost(sourceUrl)) {
            return false
        }

        const normalizePath = path => path.replace(/\/+$/, '') || '/'
        return normalizePath(candidate.pathname) === normalizePath(source.pathname)
    } catch {
        return false
    }
}

/**
 * Processes one source: discovers links, removes pages already present in the
 * database, classifies the remainder using the source configuration or
 * Firecrawl's embedded LLM (with Groq as fallback), and forwards music pages to
 * the downstream ingestion callback.
 */
export function createSourceScrapeService({
    scraperApiClient,
    groqClassificationService,
    pageRepository,
    logger
}) {
    if (!scraperApiClient) {
        throw new Error('createSourceScrapeService requires a scraping API client')
    }

    if (!groqClassificationService?.classify) {
        throw new Error('createSourceScrapeService requires a Groq classification service')
    }

    if (!pageRepository?.findExistingUrls || !pageRepository?.markScraped) {
        throw new Error('createSourceScrapeService requires a page repository')
    }

    if (!logger) {
        throw new Error('createSourceScrapeService requires a logger')
    }

    async function discoverLinks(source) {
        const payload = source.sitemapAvailable
            ? await scraperApiClient.mapSource(source.url)
            : await scraperApiClient.discoverLinks(source.url)

        return normalizeDiscoveredLinks(extractLinks(payload), source.url)
    }

    async function scrapeAndClassify({ source, link, includeTags, log }) {
        if (source.hasNonMusicEvents === false) {
            const payload = await scraperApiClient.scrapePage(link, includeTags)

            return {
                payload,
                text: extractScrapedText(payload),
                metadata: extractPageMetadata(payload),
                classification: {
                    music: true,
                    source: 'source-config'
                }
            }
        }

        let payload
        let text

        try {
            payload = await scraperApiClient.classifyPage(link, includeTags)
            text = extractScrapedText(payload)
            const embedded = extractEmbeddedClassification(payload)

            if (embedded) {
                log.info(
                    { page: link, music: embedded.music, certainty: embedded.certainty },
                    'Embedded LLM classification completed'
                )

                return {
                    payload,
                    text,
                    metadata: extractPageMetadata(payload),
                    classification: {
                        ...embedded,
                        source: 'firecrawl-llm'
                    }
                }
            }

            log.warn(
                { page: link },
                'Embedded LLM returned no classification; falling back to Groq'
            )
        } catch (error) {
            log.error(
                { err: error, page: link },
                'Embedded LLM classification failed; falling back to Groq'
            )
            payload = await scraperApiClient.scrapePage(link, includeTags)
            text = extractScrapedText(payload)
        }

        const classification = await groqClassificationService.classify({
            text,
            sourceUrl: link
        })

        return {
            payload,
            text,
            metadata: extractPageMetadata(payload),
            classification: {
                ...classification,
                source: 'groq'
            }
        }
    }

    async function processSource({ source, job, onMusicEvent }) {
        if (!source?.id || !source?.url) {
            throw new Error('processSource requires a source with id and url')
        }

        const log = logger.child({ sourceId: source.id, sourceUrl: source.url })
        const includeTags = Array.isArray(source.includeTags) ? source.includeTags : []
        const summary = {
            sourceId: source.id,
            sourceUrl: source.url,
            discovered: 0,
            alreadyKnown: 0,
            scraped: 0,
            music: 0,
            discarded: 0,
            failed: 0,
            skippedInvalidUrl: 0,
            skippedExternalUrl: 0,
            skippedSourceUrl: 0
        }

        log.info(
            {
                sitemapAvailable: source.sitemapAvailable,
                hasNonMusicEvents: source.hasNonMusicEvents
            },
            'Discovering source links'
        )
        await job.updateProgress({ stage: 'discovering-links', percent: 5 })

        const discoveredLinks = await discoverLinks(source)
        summary.discovered = discoveredLinks.length

        log.info({ links: discoveredLinks.length }, 'Source links discovered')
        await job.updateProgress({
            stage: 'links-discovered',
            percent: 10,
            discovered: discoveredLinks.length
        })

        const scopedLinks = discoveredLinks.filter(link => {
            if (isSourcePage(link, source.url)) {
                summary.skippedSourceUrl += 1
                log.debug({ page: link }, 'Skipping the source URL itself')
                return false
            }

            if (!isSameSourceBase(link, source.url)) {
                summary.skippedExternalUrl += 1
                log.debug(
                    { page: link, sourceUrl: source.url },
                    'Skipping URL outside the source base URL'
                )
                return false
            }

            return true
        })

        log.info(
            {
                discovered: discoveredLinks.length,
                scoped: scopedLinks.length,
                skippedExternalUrl: summary.skippedExternalUrl,
                skippedSourceUrl: summary.skippedSourceUrl
            },
            'Source URL scope filtering completed'
        )

        await job.updateProgress({
            stage: 'source-scope-filtered',
            percent: 12,
            discovered: discoveredLinks.length,
            scoped: scopedLinks.length,
            skippedExternalUrl: summary.skippedExternalUrl,
            skippedSourceUrl: summary.skippedSourceUrl
        })

        const validLinks = scopedLinks.filter(link => {
            if (link.length <= MAX_PAGE_URL_LENGTH) {
                return true
            }

            summary.skippedInvalidUrl += 1
            log.warn({ url: link, maxLength: MAX_PAGE_URL_LENGTH }, 'Skipping URL that exceeds pages.url length')
            return false
        })

        const existingUrls = await pageRepository.findExistingUrls(validLinks)
        summary.alreadyKnown = existingUrls.size

        const unseenLinks = validLinks.filter(link => !existingUrls.has(link))
        log.info(
            { discovered: validLinks.length, alreadyKnown: existingUrls.size, unseen: unseenLinks.length },
            'Page deduplication completed'
        )

        await job.updateProgress({
            stage: 'deduplicated',
            percent: 15,
            discovered: validLinks.length,
            alreadyKnown: existingUrls.size,
            unseen: unseenLinks.length
        })

        const pageSpan = unseenLinks.length > 0 ? 80 / unseenLinks.length : 0

        for (let index = 0; index < unseenLinks.length; index += 1) {
            const link = unseenLinks[index]
            const pageStartPercent = 15 + Math.round(index * pageSpan)
            const pageEndPercent = Math.min(99, 15 + Math.round((index + 1) * pageSpan))

            log.info({ page: link, pageIndex: index + 1, pageTotal: unseenLinks.length }, 'Processing page')
            await job.updateProgress({
                stage: 'scraping-page',
                percent: pageStartPercent,
                page: link,
                pageIndex: index + 1,
                pageTotal: unseenLinks.length
            })

            try {
                const { text, metadata, classification } = await scrapeAndClassify({
                    source,
                    link,
                    includeTags,
                    log
                })

                if (!classification.music) {
                    await pageRepository.markScraped({ url: link, sourceId: source.id })
                    summary.scraped += 1
                    summary.discarded += 1

                    log.info(
                        { page: link, classificationSource: classification.source },
                        'Page classified as non-music and discarded'
                    )
                } else {
                    // Run downstream before marking the page as scraped. If the
                    // downstream call fails the job can retry without losing the
                    // music event.
                    if (onMusicEvent) {
                        const pageProgress = update => job.updateProgress({
                            ...update,
                            percent: Math.min(
                                pageEndPercent,
                                pageStartPercent + Math.round(((update.percent ?? 0) / 100) * (pageEndPercent - pageStartPercent))
                            ),
                            page: link,
                            pageIndex: index + 1,
                            pageTotal: unseenLinks.length
                        })

                        await onMusicEvent({
                            url: link,
                            text,
                            metadata,
                            source,
                            classification,
                            job,
                            onProgress: pageProgress
                        })
                    } else {
                        log.warn(
                            { page: link },
                            'Music page found but no downstream handler is configured'
                        )
                    }

                    await pageRepository.markScraped({ url: link, sourceId: source.id })
                    summary.scraped += 1
                    summary.music += 1

                    log.info(
                        { page: link, classificationSource: classification.source },
                        'Music page forwarded to downstream ingestion'
                    )
                }

                await job.updateProgress({
                    stage: 'page-processed',
                    percent: pageEndPercent,
                    page: link,
                    pageIndex: index + 1,
                    pageTotal: unseenLinks.length
                })
            } catch (error) {
                summary.failed += 1

                log.error(
                    { err: error, page: link, pageIndex: index + 1 },
                    'Failed to process page'
                )

                await job.updateProgress({
                    stage: 'page-failed',
                    percent: pageEndPercent,
                    page: link,
                    pageIndex: index + 1,
                    pageTotal: unseenLinks.length,
                    error: error.message
                })
            }
        }

        const completionStage = summary.failed > 0
            ? 'source-completed-with-errors'
            : 'source-completed'

        await job.updateProgress({
            stage: completionStage,
            percent: 100,
            ...summary
        })

        log.info(summary, 'Source processing completed')

        if (summary.failed > 0) {
            const error = new Error(
                `${summary.failed} page(s) failed for source ${source.url}`
            )
            error.summary = summary
            throw error
        }

        return summary
    }

    return {
        processSource
    }
}
