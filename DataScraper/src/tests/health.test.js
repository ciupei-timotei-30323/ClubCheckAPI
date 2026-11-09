import test from 'node:test'
import assert from "node:assert";
import { buildApp } from "../app.js";

test('Scraper health check passes', () => {
    assert.strictEqual(1, 1, 'Basic health check failed');
});

test('Hello world endpoint works', async (t) => {
    const app = await buildApp({ logger: false });

    t.after(async () => {
        await app.close();
    });

    const response = await app.inject({
        method: 'GET',
        url: '/'
    });

    assert.strictEqual(response.statusCode, 200, 'Expected status code 200');
    assert.deepStrictEqual(response.json(), { hello: 'worlds' }, 'Expected { hello: "worlds" } response');
});