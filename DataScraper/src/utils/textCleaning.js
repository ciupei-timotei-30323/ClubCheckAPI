const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const ZERO_WIDTH_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF]/g

function decodeBasicEntities(value) {
    return value
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
}

/**
 * Normalises scraped text before it is sent to an LLM. This removes HTML,
 * decorative separators, control characters and excessive whitespace while
 * keeping words, URLs and meaningful punctuation.
 */
export function cleanScrapedText(value) {
    if (typeof value !== 'string') {
        return ''
    }

    return decodeBasicEntities(
        value
            .replace(/\r\n?/g, '\n')
            .replace(/<!--[\s\S]*?-->/g, ' ')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(CONTROL_CHARACTERS, ' ')
            .replace(ZERO_WIDTH_CHARACTERS, '')
            // Keep the accessible text and URL from markdown links/images.
            .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, ' $1 $2 ')
            .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, ' $1 $2 ')
            // Remove decorative runs such as ====, ****, ____, ---- and ####.
            .replace(/[=*_~#]{3,}/g, ' ')
            .replace(/-{3,}/g, ' ')
            .replace(/\.{4,}/g, ' ')
            .replace(/[•‣▪▫●○◆◇]/g, ' ')
            // Remove common markdown markers while preserving the text.
            .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
            .replace(/^[ \t]*>[ \t]?/gm, '')
            .replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/gm, '')
            .replace(/`+/g, '')
    )
        .replace(/\s+/g, ' ')
        .trim()
}
