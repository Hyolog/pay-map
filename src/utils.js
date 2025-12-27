import { getMap } from './map.js';

export function getAdjustedBounds() {
    var map = getMap();
    if (!map) return null;
    var bounds = map.getBounds();
    if (!bounds) return null;
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();

    var heightPx = window.innerHeight || document.documentElement.clientHeight;
    var topEl = document.getElementById('top-bar');
    var bottomEl = document.getElementById('bottom-sheet');
    var topH = topEl ? topEl.offsetHeight : 0;
    var bottomH = bottomEl ? bottomEl.offsetHeight : 0;

    var latSpan = ne.getLat() - sw.getLat();

    var topFraction = topH / heightPx;
    var bottomFraction = bottomH / heightPx;

    var adjNeLat = ne.getLat() - (latSpan * topFraction);
    var adjSwLat = sw.getLat() + (latSpan * bottomFraction);

    return {
        sw: new kakao.maps.LatLng(adjSwLat, sw.getLng()),
        ne: new kakao.maps.LatLng(adjNeLat, ne.getLng())
    };
}

export function isInAdjustedBounds(lat, lng) {
    var adj = getAdjustedBounds();
    if (!adj) return false;
    return lat >= adj.sw.getLat() && lat <= adj.ne.getLat() && lng >= adj.sw.getLng() && lng <= adj.ne.getLng();
}

export function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (s) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
    });
}
