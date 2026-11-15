import test from 'node:test'
import assert from 'node:assert'
import {
    extractEmbeddedClassification,
    extractLinks,
    extractScrapedText,
    normalizeDiscoveredLinks
} from '../utils/scraperPayload.js'

test('extractLinks handles map and links scrape response shapes', () => {
    assert.deepStrictEqual(
        extractLinks({ links: ['https://a.example', 'https://b.example'] }),
        ['https://a.example', 'https://b.example']
    )
    assert.deepStrictEqual(
        extractLinks({ data: { links: [{ url: 'https://a.example' }, { url: 'https://b.example' }] } }),
        ['https://a.example', 'https://b.example']
    )
    assert.deepStrictEqual(
        extractLinks({ data: { pages: [{ url: 'https://a.example' }] } }),
        ['https://a.example']
    )
})

test('extractScrapedText prefers readable fields and flattens tag objects', () => {
    assert.strictEqual(
        extractScrapedText({ data: { markdown: '# Event', links: ['https://a.example'] } }),
        '# Event'
    )
    assert.strictEqual(
        extractScrapedText({ data: { h1: 'Event name', '.date': 'Tomorrow' } }),
        'h1: Event name\n.date: Tomorrow'
    )
    assert.strictEqual(extractScrapedText({ data: 'plain text' }), 'plain text')
})

test('extractEmbeddedClassification reads Firecrawl embedded JSON output', () => {
    assert.deepStrictEqual(
        extractEmbeddedClassification({
            data: { json: { is_music: true, certainty: 'clear' } }
        }),
        { music: true, certainty: 'clear' }
    )
    assert.deepStrictEqual(
        extractEmbeddedClassification({
            data: { json: '{"is_music":false,"certainty":"likely"}' }
        }),
        { music: false, certainty: 'likely' }
    )
    assert.strictEqual(extractEmbeddedClassification({ data: { markdown: 'No JSON' } }), null)
})

test('normalizeDiscoveredLinks resolves relative URLs and removes fragments', () => {
    const links = normalizeDiscoveredLinks(
        ['/events/one#tickets', 'https://other.example/two', 'mailto:test@example.com'],
        'https://source.example'
    )

    assert.deepStrictEqual(links, [
        'https://source.example/events/one',
        'https://other.example/two'
    ])
})
