import test from 'node:test'
import assert from 'node:assert'
import { createPageRepository } from '../repositories/pageRepository.js'

function createLogger() {
    return { debug() {} }
}

test('page repository finds existing URLs and inserts new pages', async () => {
    const queries = []
    const pool = {
        async query(text, params) {
            queries.push({ text, params })
            if (text.startsWith('SELECT')) {
                return { rows: [{ url: 'https://known.example' }] }
            }
            return { rowCount: 1 }
        }
    }

    const repository = createPageRepository({ pool, logger: createLogger() })

    const existing = await repository.findExistingUrls([
        'https://known.example',
        'https://new.example'
    ])
    assert.deepStrictEqual([...existing], ['https://known.example'])

    const result = await repository.markScraped({
        url: 'https://new.example',
        sourceId: 7
    })
    assert.deepStrictEqual(result, { inserted: true })

    assert.match(queries[1].text, /INSERT INTO pages/)
    assert.match(queries[1].text, /"sourceId"/)
    assert.deepStrictEqual(queries[1].params, ['https://new.example', 7])
})
