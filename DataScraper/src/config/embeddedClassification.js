/**
 * Exact Firecrawl embedded-LLM format configuration from apiCall.json.
 * Used by the primary page classification request.
 */
export const EMBEDDED_CLASSIFICATION_FORMATS = Object.freeze([
    'markdown',
    Object.freeze({
        type: 'json',
        prompt: `Classify whether this page is about a SINGLE music event.

Return is_music: false if:
1. Index or multi-event page: The first # heading is a generic listing title (e.g., "Events", "Concerts", "Shows", "Calendar", "Archive") OR the main body lists multiple distinct events rather than one dedicated event. (Ignore navigation menus and "Related Events" sections.)
2. Non-music event: The first # main heading is clearly not music-related (e.g., stand-up comedy, theater, sports, workshop, exhibition).

Otherwise, look ONLY at the very first # main heading to classify if that title is a music event.

Certainty rubric:
- clear: Explicit music or non-music keyword in the # heading, or clearly an index/multi-event page.
- likely: Strongly implied by the title.
- unclear: Only a proper name with no genre cue.`,
        schema: Object.freeze({
            type: 'object',
            properties: Object.freeze({
                is_music: Object.freeze({type: 'boolean'}),
                certainty: Object.freeze({
                    type: 'string',
                    enum: Object.freeze(['clear', 'likely', 'unlikely', 'unclear'])
                })
            }),
            required: Object.freeze(['is_music', 'certainty'])
        })
    })
])
