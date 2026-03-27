import { TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE_URL } from './config.js';

// Simple in-memory cache to prevent redundant requests
const apiCache = new Map();

/**
 * Función principal para hacer peticiones HTTP
 * @param {string} endpoint - La ruta de la API (ej: /search/tv)
 * @param {object} params - Parámetros de la query (ej: { query: 'bluey' })
 * @returns {Promise<any>}
 */
async function fetchFromTMDB(endpoint, params = {}) {
    // Parámetros por defecto
    const defaultParams = {
        api_key: TMDB_API_KEY,
        language: 'es-ES' // Resultados en español
    };
    
    const queryParams = new URLSearchParams({ ...defaultParams, ...params });
    const url = `${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`;
    
    // Check cache
    if (apiCache.has(url)) {
        console.log("Servido desde caché:", endpoint);
        return apiCache.get(url);
    }
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error de API: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Guardar en cache
        apiCache.set(url, data);
        
        return data;
    } catch (error) {
        console.error('Error fetching TMDB:', error);
        throw error;
    }
}

// ==========================================
// ENDPOINTS
// ==========================================

// 1. ENDPOINT: /search/tv - Buscar series por nombre
export async function searchTV(query) {
    if (!query) return null;
    return await fetchFromTMDB('/search/tv', { query });
}

// 2. ENDPOINT: /genre/tv/list - Obtener lista de géneros
export async function getTVGenres() {
    return await fetchFromTMDB('/genre/tv/list');
}

// 3. ENDPOINT: /discover/tv - Descubrir series (por género, etc)
export async function discoverTVByGenre(genreId) {
    return await fetchFromTMDB('/discover/tv', { with_genres: genreId, sort_by: 'popularity.desc' });
}

// 4. ENDPOINT: /tv/{series_id} - Obtener detalles exactos de una serie
export async function getTVDetails(seriesId) {
    return await fetchFromTMDB(`/tv/${seriesId}`);
}

// 5. ENDPOINT: /tv/{series_id}/credits - Obtener el elenco (actores)
export async function getTVCredits(seriesId) {
    return await fetchFromTMDB(`/tv/${seriesId}/aggregate_credits`);
}

// 6. ENDPOINT: /tv/{series_id}/recommendations - Obtener recomendaciones basadas en esta serie
export async function getTVRecommendations(seriesId) {
    return await fetchFromTMDB(`/tv/${seriesId}/recommendations`);
}

// 7. ENDPOINT: /tv/{series_id}/season/{season_number} - Obtener detalles de una temporada (episodios)
export async function getTVSeasonDetails(seriesId, seasonNumber) {
    return await fetchFromTMDB(`/tv/${seriesId}/season/${seasonNumber}`);
}

// Utilidad para construir la URL de una imagen
export function getImageUrl(path, size = 'w500') {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
}
