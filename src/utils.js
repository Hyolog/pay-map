// ===== Utility Helpers =====
// Helper functions for bounds calculation, viewport math, and HTML security

import { getMap } from './map.js';

// Calculate the visible map bounds adjusted for top and bottom UI panels
// Returns adjusted bounds with sw (southwest) and ne (northeast) corners as LatLng objects
// Returns null if map is not ready or bounds are unavailable
export function getAdjustedBounds() {
    var map = getMap();
    if (!map) return null;
    var bounds = map.getBounds();
    if (!bounds) return null;
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();

    // Calculate UI panel heights (top-bar and bottom-sheet)
    var heightPx = window.innerHeight || document.documentElement.clientHeight;
    var topEl = document.getElementById('top-bar');
    var bottomEl = document.getElementById('bottom-sheet');
    var topH = topEl ? topEl.offsetHeight : 0;
    var bottomH = bottomEl ? bottomEl.offsetHeight : 0;

    // Convert pixel heights to latitude fractions for bounds adjustment
    var latSpan = ne.getLat() - sw.getLat();
    var topFraction = topH / heightPx;
    var bottomFraction = bottomH / heightPx;

    // Adjust latitude bounds: squeeze top and bottom by UI panel heights
    var adjNeLat = ne.getLat() - (latSpan * topFraction);
    var adjSwLat = sw.getLat() + (latSpan * bottomFraction);

    return {
        sw: new kakao.maps.LatLng(adjSwLat, sw.getLng()),
        ne: new kakao.maps.LatLng(adjNeLat, ne.getLng())
    };
}

// Check if a latitude/longitude point falls within the adjusted visible map bounds
// Accounts for UI panels (top-bar, bottom-sheet) by using adjusted bounds
// Returns false if adjusted bounds unavailable (map not ready)
export function isInAdjustedBounds(lat, lng) {
    var adj = getAdjustedBounds();
    if (!adj) return false;
    return lat >= adj.sw.getLat() && lat <= adj.ne.getLat() && lng >= adj.sw.getLng() && lng <= adj.ne.getLng();
}

// Escape HTML special characters to prevent XSS injection attacks
// Converts &, <, >, ", ' to their HTML entity equivalents
// Returns empty string if input is null/undefined
export function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (s) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
    });
}
