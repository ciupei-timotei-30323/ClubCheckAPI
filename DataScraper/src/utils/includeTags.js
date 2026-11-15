/**
 * Removes stray wrapping quotes/backslashes that can end up in selectors
 * coming from JSON strings, comma-separated source configuration, or
 * double-encoded JSON.
 */
export function sanitizeSelector(value) {
    let result = String(value ?? '').trim()
    let previous

    do {
        previous = result
        result = result
            .replace(/^\\+/, '')
            .replace(/\\+$/, '')
            .trim()
            .replace(/^["']+/, '')
            .replace(/["']+$/, '')
            .trim()
    } while (result !== previous)

    return result
}

function parseJsonArray(value) {
    let current = value

    for (let depth = 0; depth < 3; depth += 1) {
        if (Array.isArray(current)) {
            return current
        }

        if (typeof current !== 'string') {
            return null
        }

        try {
            current = JSON.parse(current)
        } catch {
            return null
        }
    }

    return Array.isArray(current) ? current : null
}

/**
 * Normalises source `includeTags` into a clean list of CSS selectors.
 */
export function normalizeIncludeTags(value) {
    if (!value) {
        return []
    }

    const fromJson = parseJsonArray(value)
    const rawTags = fromJson ?? (Array.isArray(value) ? value : String(value).split(','))

    return rawTags
        .map(sanitizeSelector)
        .filter(Boolean)
}
