import * as api from './api.js';

// DOM Elements
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');

const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view-section');

const searchResultsGrid = document.getElementById('search-results-grid');
const searchResultsTitle = document.getElementById('search-results-title');
const loaderSearch = document.getElementById('loader-search');

// --- Bluey Relevance ---
// Lowest threshold: match "bluey" anywhere, or at least one related keyword.
const BLUEY_KEYWORDS = [
    'bluey',
    'heeler',
    'bandit heeler',
    'chilli heeler',
    'bingo heeler',
    'bluey minisode',
    'bluey minisodes',
    'bluey short',
    'bluey shorts',
    'bluey bonus bits',
    'bluey the show',
    'bluey\'s big play'
];

function isBlueyRelated(item) {
    const name = (item.name || '').toLowerCase();
    const originalName = (item.original_name || '').toLowerCase();
    const overview = (item.overview || '').toLowerCase();
    const text = `${name} ${originalName} ${overview}`;

    if (text.includes('bluey')) return true;

    // Lowest threshold: any single related keyword match
    return BLUEY_KEYWORDS.some(keyword => text.includes(keyword));
}



const detailsModal = document.getElementById('details-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalBody = document.getElementById('modal-body');

const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const closeError = document.getElementById('close-error');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initModal();
    initErrorHandling();
    registerServiceWorker();
    
    // Auto-load Bluey series
    loadBlueySeries();
});

// --- Service Worker Registration ---
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
}

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const icon = themeToggle.querySelector('i');
    
    if (savedTheme === 'light') {
        body.classList.remove('dark-theme');
        icon.classList.replace('fa-sun', 'fa-moon');
    }
    
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-theme');
        const isDark = body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        icon.classList.toggle('fa-sun');
        icon.classList.toggle('fa-moon');
    });
}



// --- Error Handling ---
function showError(msg) {
    errorMessage.textContent = msg;
    errorContainer.classList.remove('hidden');
    setTimeout(() => {
        errorContainer.classList.add('hidden');
    }, 5000);
}

function initErrorHandling() {
    closeError.addEventListener('click', () => {
        errorContainer.classList.add('hidden');
    });
}

// --- Load Series ---
async function loadBlueySeries() {
    try {
        loaderSearch.classList.remove('hidden');
        searchResultsGrid.innerHTML = '';
        searchResultsTitle.textContent = `Cargando series de Bluey...`;
        
        const response = await api.searchTV('Bluey');
        
        // Strict Bluey Filtering, excluding the 1976 series
        const filteredResults = response.results.filter(item => {
            if (!isBlueyRelated(item)) return false;
            // Exclude the 1976 Bluey show
            if (item.first_air_date && item.first_air_date.startsWith('1976')) return false;
            return true;
        });
        
        if (filteredResults.length > 0) {
            // Show only the top three animated series
            const topThree = filteredResults.slice(0, 3);
            searchResultsTitle.textContent = `Series Animadas de Bluey`;
            renderSeriesGrid(topThree, searchResultsGrid);
        } else {
            searchResultsTitle.textContent = `No se encontraron series de Bluey.`;
        }
    } catch (err) {
        showError("Ups, error al cargar las series. Verifica tu conexión o Api Key.");
        console.error(err);
    } finally {
        loaderSearch.classList.add('hidden');
    }
}


// --- Render Utils ---
function renderSeriesGrid(seriesList, container) {
    seriesList.forEach(series => {
        const card = document.createElement('div');
        card.className = 'series-card';
        card.dataset.id = series.id;
        card.addEventListener('click', () => openSeriesDetails(series.id));
        
        const imageUrl = api.getImageUrl(series.poster_path);
        const year = series.first_air_date ? series.first_air_date.substring(0, 4) : 'N/A';
        const rating = series.vote_average ? series.vote_average.toFixed(1) : 'NR';
        
        card.innerHTML = `
            <div class="card-image-wrapper">
                ${imageUrl 
                    ? `<img src="${imageUrl}" alt="${series.name}" loading="lazy">` 
                    : `<div class="no-image"><i class="fa-solid fa-image"></i> Sin Imagen</div>`}
                <div class="card-overlay">
                    <span class="card-rating" title="Calificación TMDB: ${rating}/10"><i class="fa-solid fa-star"></i> ${rating}</span>
                </div>
            </div>
            <div class="card-content">
                <h3 class="card-title" title="${series.name}">${series.name}</h3>
                <span class="card-year">${year}</span>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// --- Details Modal ---
function initModal() {
    closeModalBtn.addEventListener('click', closeModal);
    
    // Close on click outside
    detailsModal.addEventListener('click', (e) => {
        if (e.target === detailsModal) {
            closeModal();
        }
    });
    
    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !detailsModal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

function closeModal() {
    detailsModal.classList.add('hidden');
    body.style.overflow = ''; // Restore scrolling
}

async function openSeriesDetails(seriesId) {
    modalBody.innerHTML = '<div class="modal-loader"><div class="loader"></div><p>Cargando detalles increíbles...</p></div>';
    detailsModal.classList.remove('hidden');
    body.style.overflow = 'hidden'; // Prevent background scrolling
    
    try {
        // Fetch details first as they are critical
        const details = await api.getTVDetails(seriesId);
        
        // Fetch credits and recommendations in parallel, but handle their potential failure
        let credits = { cast: [] };
        let recommendations = { results: [] };
        
        try {
            const [creditsRes, recommendationsRes] = await Promise.all([
                api.getTVCredits(seriesId).catch(() => ({ cast: [] })),
                api.getTVRecommendations(seriesId).catch(() => ({ results: [] }))
            ]);
            credits = creditsRes;
            recommendations = recommendationsRes;
        } catch (e) {
            console.warn("Error loading secondary details:", e);
        }
        
        renderDetailsModal(details, credits, recommendations);
        
    } catch (err) {
        console.error("Critical error loading series details:", err);
        modalBody.innerHTML = `
            <div class="error-container" style="margin:2rem; flex-direction:column; text-align:center;">
                <i class="fa-solid fa-triangle-exclamation fa-3x" style="margin-bottom:1rem;"></i>
                <div>Error crítico al cargar los datos básicos de esta serie.</div>
                <button class="btn-primary" style="margin-top:1rem;" onclick="document.getElementById('close-modal').click()">Cerrar</button>
            </div>`;
    }
}

function renderDetailsModal(details, credits, recs) {
    // Better backdrop fallback
    const backdropUrl = details.backdrop_path ? api.getImageUrl(details.backdrop_path, 'w1280') : null;
    const posterUrl = details.poster_path ? api.getImageUrl(details.poster_path, 'w500') : null;
    const year = details.first_air_date ? details.first_air_date.substring(0, 4) : 'N/A';
    const genres = (details.genres && details.genres.length > 0) 
        ? details.genres.map(g => `<span class="badge">${g.name}</span>`).join('') 
        : '<span class="badge">General</span>';

    // Cast HTML
    let castHTML = '<p class="empty-state">No hay información del reparto disponible.</p>';
    if (credits.cast && credits.cast.length > 0) {
        castHTML = credits.cast.map(actor => {
            const profileUrl = actor.profile_path ? api.getImageUrl(actor.profile_path, 'w185') : null;
            
            let roleName = actor.character;
            if (actor.roles && actor.roles.length > 0) {
                roleName = actor.roles.map(r => r.character).join(', ');
            }

            return `
                <div class="cast-member">
                    ${profileUrl 
                        ? `<img src="${profileUrl}" alt="${actor.name}">` 
                        : `<div class="cast-placeholder" style="width:80px;height:80px;border-radius:50%;background:var(--border-color);display:flex;align-items:center;justify-content:center;margin: 0 auto 0.5rem;"><i class="fa-solid fa-user"></i></div>`}
                    <div class="cast-name">${actor.name || 'Desconocido'}</div>
                    <div class="cast-role">${roleName || 'Personaje'}</div>
                </div>
            `;
        }).join('');
    }

    // Recs HTML (Strict Bluey Filtering)
    let recsHTML = '<p class="empty-state">No hay recomendaciones específicas de Bluey.</p>';
    if (recs.results && recs.results.length > 0) {
        const filteredRecs = recs.results
            .filter(rec => isBlueyRelated(rec))
            .slice(0, 10);
        
        if (filteredRecs.length > 0) {
            recsHTML = filteredRecs.map(rec => {
                const recPoster = rec.poster_path ? api.getImageUrl(rec.poster_path, 'w185') : null;
                return `
                    <div class="cast-member" style="cursor:pointer;" onclick="dispatchEvent(new CustomEvent('loadSeries', {detail: ${rec.id}}))">
                        ${recPoster 
                            ? `<img src="${recPoster}" alt="${rec.name}">` 
                            : `<div class="cast-placeholder" style="width:80px;height:120px;border-radius:8px;background:var(--border-color);display:flex;align-items:center;justify-content:center;margin: 0 auto 0.5rem;"><i class="fa-solid fa-tv"></i></div>`}
                        <div class="cast-name" style="width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${rec.name}">${rec.name}</div>
                    </div>
                `;
            }).join('');
        }
    }
        
    // Custom event listener for recommendations
    const handleRecClick = (e) => {
         openSeriesDetails(e.detail);
    };
    document.removeEventListener('loadSeries', handleRecClick);
    document.addEventListener('loadSeries', handleRecClick, { once: true });

    // Seasons HTML
    let seasonsHTML = '';
    if (details.seasons && details.seasons.length > 0) {
        // Filter out "Season 0" (Specials) if there are other seasons, or keep if user wants
        const regularSeasons = details.seasons.filter(s => s.season_number > 0);
        const seasonsToDisplay = regularSeasons.length > 0 ? regularSeasons : details.seasons;
        
        seasonsHTML = `
            <div class="seasons-container">
                <h3>Temporadas y Episodios</h3>
                <div class="seasons-tabs" id="seasons-tabs">
                    ${seasonsToDisplay.map((s, index) => `
                        <div class="season-tab ${index === 0 ? 'active' : ''}" data-season="${s.season_number}">
                            T${s.season_number}
                        </div>
                    `).join('')}
                </div>
                <div class="episodes-list" id="episodes-list">
                    <div class="modal-loader"><div class="loader"></div></div>
                </div>
            </div>
        `;
    }

    modalBody.innerHTML = `
        <div class="modal-header-bg" style="background-image: ${backdropUrl ? `url('${backdropUrl}')` : 'none'}; background-color: #0f172a; border-bottom: 2px solid var(--primary-color);">
            ${!backdropUrl ? '<div style="height:100%; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.2)"><i class="fa-solid fa-film fa-4x"></i></div>' : ''}
        </div>
        <div class="modal-details">
            <div class="modal-poster-container">
                ${posterUrl 
                    ? `<img src="${posterUrl}" alt="${details.name}" class="modal-poster">` 
                    : '<div class="modal-poster" style="display:flex; align-items:center; justify-content:center; background:var(--border-color)"><i class="fa-solid fa-tv fa-3x" style="color:var(--text-secondary)"></i></div>'}
            </div>
            
            <div class="modal-info">
                <h2 class="modal-title">${details.name || 'Título no disponible'}</h2>
                <div class="modal-meta">
                    <span><i class="fa-solid fa-calendar"></i> ${year}</span>
                    <span title="Calificación TMDB: ${details.vote_average ? details.vote_average.toFixed(1) : 'NR'}/10"><i class="fa-solid fa-star" style="color: var(--accent-color);"></i> ${details.vote_average ? details.vote_average.toFixed(1) : 'NR'}</span>
                    <span><i class="fa-solid fa-layer-group"></i> ${details.number_of_seasons || '?'} Temp. / ${details.number_of_episodes || '?'} Eps.</span>
                </div>
                
                <div class="genre-badges" style="display:flex; gap:0.5rem; margin-bottom:1.5rem; flex-wrap:wrap;">${genres}</div>
                
                <h3>Sinopsis</h3>
                <p class="modal-overview">${details.overview || 'Lo sentimos, no hay una sinopsis detallada para este contenido de Bluey en español.'}</p>
                
                ${seasonsHTML}

                <h3 style="margin-top: 1.5rem;">Personajes y Actores</h3>
                <div class="horizontal-list">
                    ${castHTML}
                </div>
                
                <h3 style="margin-top: 1.5rem;">Más de Bluey para ti</h3>
                <div class="horizontal-list">
                    ${recsHTML}
                </div>
            </div>
        </div>
    `;

    // Initialize Season Tabs
    const tabs = modalBody.querySelectorAll('.season-tab');
    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                loadSeasonEpisodes(details.id, tab.dataset.season);
            });
        });
        // Load first season by default
        loadSeasonEpisodes(details.id, tabs[0].dataset.season);
    }
}

async function loadSeasonEpisodes(seriesId, seasonNumber) {
    const listContainer = document.getElementById('episodes-list');
    listContainer.innerHTML = '<div class="modal-loader"><div class="loader"></div></div>';
    
    try {
        const seasonData = await api.getTVSeasonDetails(seriesId, seasonNumber);
        renderEpisodes(seasonData.episodes, listContainer);
    } catch (err) {
        listContainer.innerHTML = '<p class="empty-state">Error al cargar los episodios de esta temporada.</p>';
        console.error(err);
    }
}

function renderEpisodes(episodes, container) {
    if (!episodes || episodes.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay episodios disponibles para esta temporada.</p>';
        return;
    }

    container.innerHTML = episodes.map(ep => {
        const epImg = ep.still_path ? api.getImageUrl(ep.still_path, 'w500') : null;
        return `
            <div class="episode-item">
                ${epImg 
                    ? `<img src="${epImg}" alt="${ep.name}" class="episode-image">` 
                    : `<div class="episode-image" style="display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-play"></i></div>`}
                <div class="episode-info">
                    <div class="episode-header">
                        <div class="episode-title">
                            <span class="episode-number">E${ep.episode_number}</span> ${ep.name}
                        </div>
                        <div class="episode-meta">
                            <span title="Calificación TMDB: ${ep.vote_average ? ep.vote_average.toFixed(1) : 'NR'}/10"><i class="fa-solid fa-star" style="color: var(--accent-color);"></i> ${ep.vote_average ? ep.vote_average.toFixed(1) : 'NR'}</span>
                            <span><i class="fa-solid fa-clock"></i> ${ep.runtime ? ep.runtime + ' min' : ''}</span>
                        </div>
                    </div>
                    <p class="episode-overview">${ep.overview || 'Sin descripción disponible para este capítulo.'}</p>
                </div>
            </div>
        `;
    }).join('');
}
