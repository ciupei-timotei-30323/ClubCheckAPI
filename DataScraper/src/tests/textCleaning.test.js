import test from 'node:test'
import assert from 'node:assert'
import { cleanScrapedText } from '../utils/textCleaning.js'

test('cleanScrapedText removes separators and collapses whitespace', () => {
    const cleaned = cleanScrapedText(
        'Event name\r\n\r\n====\r\nDate:\t31 December 2026\n\n----\nVenue:   Test Hall'
    )

    assert.strictEqual(cleaned, 'Event name Date: 31 December 2026 Venue: Test Hall')
    assert.doesNotMatch(cleaned, /====|----|\n|\t/)
})

test('cleanScrapedText removes markup and decorative formatting while keeping links', () => {
    const cleaned = cleanScrapedText(`
        <h1>Live concert</h1>
        <script>alert("ignore")</script>
        ## Line-up
        - Artist One
        - [Artist Two](https://example.com/artist-two)
        ![Poster](https://example.com/poster.jpg)
        &nbsp;Encore&nbsp;
    `)

    assert.strictEqual(
        cleaned,
        'Live concert Line-up Artist One Artist Two https://example.com/artist-two Poster https://example.com/poster.jpg Encore'
    )
})

test('cleanScrapedText rejects non-string input', () => {
    assert.strictEqual(cleanScrapedText(null), '')
    assert.strictEqual(cleanScrapedText(undefined), '')
    assert.strictEqual(cleanScrapedText(42), '')
})
