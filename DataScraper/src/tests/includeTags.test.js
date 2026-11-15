import test from 'node:test'
import assert from 'node:assert'
import { normalizeIncludeTags, sanitizeSelector } from '../utils/includeTags.js'

test('sanitizeSelector removes wrapping quotes and escaped quotes', () => {
    assert.strictEqual(sanitizeSelector('".epmenurow"'), '.epmenurow')
    assert.strictEqual(sanitizeSelector('\\".epcontent\\"'), '.epcontent')
    assert.strictEqual(sanitizeSelector("' .date '"), '.date')
    assert.strictEqual(sanitizeSelector('  h1  '), 'h1')
})

test('normalizeIncludeTags cleans quoted JSON array values', () => {
    const value = JSON.stringify(['".epmenurow"', '".epcontent"'])

    assert.deepStrictEqual(normalizeIncludeTags(value), ['.epmenurow', '.epcontent'])
})

test('normalizeIncludeTags supports double-encoded JSON', () => {
    const value = JSON.stringify(JSON.stringify(['".epmenurow"', '".epcontent"']))

    assert.deepStrictEqual(normalizeIncludeTags(value), ['.epmenurow', '.epcontent'])
})

test('normalizeIncludeTags supports comma-separated quoted selectors', () => {
    assert.deepStrictEqual(
        normalizeIncludeTags('".epmenurow", " .epcontent "'),
        ['.epmenurow', '.epcontent']
    )
})
