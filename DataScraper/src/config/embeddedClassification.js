/**
 * Exact Firecrawl embedded-LLM format configuration from apiCall.json.
 * Used by the primary page classification request.
 */
export const EMBEDDED_CLASSIFICATION_FORMATS = Object.freeze([
    'markdown',
    Object.freeze({
        type: 'json',
        prompt: 'Look ONLY at the very first # main heading at the top of the page and ignore all menus, descriptions, and related events below it. Classify if that title is a music event. Certainty rubric: clear (explicit music or non-music keyword in title), likely (strongly implied), unclear (only a proper name with no genre cue).',
        schema: Object.freeze({
            type: 'object',
            properties: Object.freeze({
                is_music: Object.freeze({ type: 'boolean' }),
                certainty: Object.freeze({
                    type: 'string',
                    enum: Object.freeze(['clear', 'likely', 'unlikely', 'unclear'])
                })
            }),
            required: Object.freeze(['is_music', 'certainty'])
        })
    })
])
