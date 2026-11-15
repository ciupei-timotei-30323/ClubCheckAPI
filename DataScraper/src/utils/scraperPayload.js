import { cleanScrapedText } from './textCleaning.js'

function collectText(value) {
    if (value === null || value === undefined) {
        return ''
    }

    if (typeof value === 'string') {
        return value
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value)
    }

    if (Array.isArray(value)) {
        return value.map(collectText).filter(Boolean).join('\n')
    }

    if (typeof value === 'object') {
        return Object.entries(value)
            .map(([key, item]) => {
                const text = collectText(item)
                return text ? `${key}: ${text}` : ''
            })
            .filter(Boolean)
            .join('\n')
    }

    return ''
}

function collectLinks(value, output, depth = 0) {
    if (!value || depth > 4) {
        return
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            if (typeof item === 'string') {
                output.push(item)
            } else if (item && typeof item === 'object') {
                output.push(item.url ?? item.link ?? item.href)
            }
        }
        return
    }

    if (typeof value === 'object') {
        for (const [key, item] of Object.entries(value)) {
            if (/links?|urls?|data|results?|pages?/i.test(key)) {
                collectLinks(item, output, depth + 1)
            }
        }
    }
}

/**
 * Accepts the common response shapes returned by /map and /scrape with
 * formats: ["links"] and returns a flat list of link strings.
 */
export function extractLinks(payload) {
    const links = []
    collectLinks(payload, links)
    return [...new Set(links.filter(Boolean))]
}

/**
 * Accepts the response returned by /scrape for a page and turns its `data`
 * field into text suitable for classification.
 */
export function extractScrapedText(payload) {
    const data = payload?.data ?? payload

    if (data === null || data === undefined) {
        return ''
    }

    if (typeof data === 'string') {
        return data
    }

    if (typeof data === 'object') {
        for (const key of ['markdown', 'text', 'content', 'html', 'body']) {
            if (typeof data[key] === 'string' && data[key].trim()) {
                return data[key]
            }
        }
    }

    return collectText(data)
}


function metadataString(metadata, keys) {
    for (const key of keys) {
        const value = metadata.get(key)

        if (typeof value === 'string' && value.trim()) {
            return cleanScrapedText(value)
        }

        if (Array.isArray(value)) {
            const first = value.find(item => typeof item === 'string' && item.trim())
            if (first) {
                return cleanScrapedText(first)
            }
        }
    }

    return null
}

/**
 * Extracts the page metadata useful for event extraction. Firecrawl exposes
 * poster images as `image` or `og:image`, and some sources expose the organizer
 * through organizer/promoter/author metadata.
 */
export function extractPageMetadata(payload) {
    const data = payload?.data ?? payload
    const rawMetadata = data?.metadata ?? payload?.metadata

    if (!rawMetadata || typeof rawMetadata !== 'object') {
        return {
            title: null,
            description: null,
            image: null,
            organizer: null,
            siteName: null,
            sourceUrl: null
        }
    }

    const metadata = new Map(
        Object.entries(rawMetadata).map(([key, value]) => [key.toLowerCase(), value])
    )

    return {
        title: metadataString(metadata, ['title', 'og:title']),
        description: metadataString(metadata, ['description', 'og:description']),
        image: metadataString(metadata, [
            'image',
            'og:image',
            'og:image:url',
            'ogimage',
            'twitter:image',
            'twitterimage'
        ]),
        organizer: metadataString(metadata, [
            'organizer',
            'event:organizer',
            'eventorganizer',
            'promoter',
            'host',
            'author',
            'creator'
        ]),
        siteName: metadataString(metadata, ['og:site_name', 'sitename', 'publisher']),
        sourceUrl: metadataString(metadata, ['sourceurl', 'source_url', 'url', 'og:url'])
    }
}

export function extractEmbeddedClassification(payload) {
    const data = payload?.data ?? payload
    let json = data?.json ?? payload?.json ?? data?.llm_extraction ?? data?.extract ?? null

    if (typeof json === 'string') {
        try {
            json = JSON.parse(json)
        } catch {
            return null
        }
    }

    if (!json || typeof json.is_music !== 'boolean') {
        return null
    }

    return {
        music: json.is_music,
        certainty: typeof json.certainty === 'string' ? json.certainty : null
    }
}

export function normalizeDiscoveredLinks(links, baseUrl) {
    const normalized = []

    for (const link of links ?? []) {
        try {
            const url = new URL(link, baseUrl)

            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                continue
            }

            url.hash = ''
            normalized.push(url.toString())
        } catch {
            // Ignore malformed links returned by the scraping API.
        }
    }

    return [...new Set(normalized)]
}
