/**
 * Normalizes user input for caching and AI processing.
 * Addresses common Indian food synonyms to improve cache hit rates.
 */

export function normalizeInput(input: string): string {
    let normalized = input.toLowerCase().trim();
    
    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ');

    // Canonical mappings for common terms
    const mappings: Record<string, string> = {
        'roti': 'chapati',
        'phulka': 'chapati',
        'yogurt': 'curd',
        'dahi': 'curd',
        'chana masala': 'chole',
        'black dal': 'dal makhani',
        'chai': 'tea',
    };

    // Very basic replacement for caching normalization (not perfect NLP, but helps cache hits)
    Object.entries(mappings).forEach(([synonym, canonical]) => {
        const regex = new RegExp(`\\b${synonym}\\b`, 'g');
        normalized = normalized.replace(regex, canonical);
    });

    return normalized;
}

/**
 * Generates a SHA-256 hash for the normalized input using Web Crypto API.
 */
export async function generateInputHash(input: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
