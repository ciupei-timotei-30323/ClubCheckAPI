import test from 'node:test'
import assert from 'node:assert'
import {
    createStructuredDataExtractor,
    structuredDataJsonSchema,
    StructuredDataExtractionError
} from '../inferences/structuredDataInference.js'

function createLogger() {
    const entries = []
    const logger = {
        entries,
        child(context) {
            return {
                ...logger,
                context,
                info: (data, message) => entries.push(['info', message, data]),
                warn: (data, message) => entries.push(['warn', message, data]),
                error: (data, message) => entries.push(['error', message, data])
            }
        },
        info: (data, message) => entries.push(['info', message, data]),
        warn: (data, message) => entries.push(['warn', message, data]),
        error: (data, message) => entries.push(['error', message, data])
    }

    return logger
}

const validStructuredData = {
    events: [{
        name: 'Test Event',
        startDate: '2026-12-31T20:00:00+02:00',
        isActive: true,
        endDate: null,
        description: 'A test event.',
        price: { value: 50, currency: 'RON' },
        ticketUrl: 'https://tickets.example.com/test-event',
        announcementUrl: null,
        venueName: 'Test Venue',
        artistNames: ['Test Artist'],
        genreNames: ['Techno']
    }],
    venues: [{
        name: 'Test Venue',
        address: {
            zipCode: null,
            number: null,
            street: null,
            city: 'Cluj-Napoca',
            county: null,
            country: 'Romania',
            googleMapsUrl: null
        }
    }],
    artists: [{ name: 'Test Artist', slug: 'test-artist' }],
    genres: [{ name: 'Techno' }]
}

function createAi(outputText, status = 'completed') {
    const calls = []
    return {
        calls,
        interactions: {
            async create(params) {
                calls.push(params)
                return {
                    id: 'interaction-1',
                    status,
                    output_text: outputText,
                    usage: { total_input_tokens: 10, total_output_tokens: 20 }
                }
            }
        }
    }
}

test('Gemini schema is converted to the supported subset', () => {
    assert.strictEqual('$schema' in structuredDataJsonSchema, false)
    assert.strictEqual('additionalProperties' in structuredDataJsonSchema, false)

    const endDate = structuredDataJsonSchema.properties.events.items.properties.endDate
    assert.strictEqual(endDate.type, 'string')
    assert.strictEqual(endDate.nullable, true)
    assert.strictEqual(endDate.format, 'date-time')
    assert.strictEqual(endDate.pattern, undefined)
})

test('structured extractor calls Gemini with the ClubCheckAPI schema and validates output', async () => {
    const ai = createAi(JSON.stringify(validStructuredData))
    const logger = createLogger()
    const extractor = createStructuredDataExtractor({
        ai,
        model: 'gemini-4-hydrogen',
        logger
    })

    const result = await extractor.extract({
        text: 'Test Event at Test Venue on 31 December 2026.',
        sourceUrl: 'https://example.com/events/test-event'
    })

    assert.strictEqual(ai.calls.length, 1)
    const request = ai.calls[0]
    assert.strictEqual(request.model, 'gemini-4-hydrogen')
    assert.strictEqual(request.response_format[0].type, 'text')
    assert.strictEqual(request.response_format[0].mime_type, 'application/json')
    assert.strictEqual(request.response_format[0].schema.type, 'object')
    assert.strictEqual(request.store, false)
    assert.match(request.input, /Source URL: https:\/\/example\.com\/events\/test-event/)
    assert.match(request.input, /<page_text>/)

    assert.strictEqual(result.structured.events[0].name, 'Test Event')
    assert.strictEqual(result.structured.venues[0].address.city, 'Cluj-Napoca')
    assert.strictEqual(result.structured.artists[0].slug, 'test-artist')
    assert.strictEqual(result.interactionId, 'interaction-1')
    assert.deepStrictEqual(result.usage, { total_input_tokens: 10, total_output_tokens: 20 })
})

test('structured extractor accepts JSON wrapped in a code fence', async () => {
    const ai = createAi(`\`\`\`json\n${JSON.stringify(validStructuredData)}\n\`\`\``)
    const extractor = createStructuredDataExtractor({
        ai,
        model: 'gemini-4-hydrogen',
        logger: createLogger()
    })

    const result = await extractor.extract({
        text: 'Test Event',
        sourceUrl: 'https://example.com'
    })

    assert.strictEqual(result.structured.events.length, 1)
})

test('structured extractor rejects a failed Gemini interaction', async () => {
    const ai = createAi('', 'failed')
    const extractor = createStructuredDataExtractor({
        ai,
        model: 'gemini-4-hydrogen',
        logger: createLogger()
    })

    await assert.rejects(
        () => extractor.extract({ text: 'text', sourceUrl: 'https://example.com' }),
        error => error instanceof StructuredDataExtractionError && /did not complete/.test(error.message)
    )
})

test('structured extractor rejects invalid JSON', async () => {
    const ai = createAi('not json')
    const extractor = createStructuredDataExtractor({
        ai,
        model: 'gemini-4-hydrogen',
        logger: createLogger()
    })

    await assert.rejects(
        () => extractor.extract({ text: 'text', sourceUrl: 'https://example.com' }),
        /invalid JSON/
    )
})

test('structured extractor rejects output that does not match the API schema', async () => {
    const invalid = {
        ...validStructuredData,
        events: [{ ...validStructuredData.events[0], venueName: '' }]
    }
    const ai = createAi(JSON.stringify(invalid))
    const extractor = createStructuredDataExtractor({
        ai,
        model: 'gemini-4-hydrogen',
        logger: createLogger()
    })

    await assert.rejects(
        () => extractor.extract({ text: 'text', sourceUrl: 'https://example.com' }),
        /did not match the ClubCheckAPI schema/
    )
})
