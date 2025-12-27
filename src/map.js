let mapInstance = null;
let clusterer = null;

export function initMap(containerId) {
    const mapContainer = document.getElementById(containerId);
    const mapOption = { center: new kakao.maps.LatLng(37.2415, 127.1775), level: 8 };
    mapInstance = new kakao.maps.Map(mapContainer, mapOption);

    const mapTypeControl = new kakao.maps.MapTypeControl();
    mapInstance.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
    const zoomControl = new kakao.maps.ZoomControl();
    mapInstance.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    clusterer = new kakao.maps.MarkerClusterer({ map: mapInstance, averageCenter: true, minLevel: 5 });
}

export function getMap() { return mapInstance; }

export function onMapIdle(cb) { if (mapInstance) kakao.maps.event.addListener(mapInstance, 'idle', cb); }
export function onMapZoomChanged(cb) { if (mapInstance) kakao.maps.event.addListener(mapInstance, 'zoom_changed', cb); }

export function clearMarkers(markersGlobal) {
    markersGlobal.forEach(m => { try { if (m.marker) m.marker.setMap(null); else if (m.setMap) m.setMap(null); } catch(e){} });
}

export function addMarkersToCluster(markers) {
    if (clusterer) clusterer.addMarkers(markers);
}

export function getClusterer() { return clusterer; }

export function centerMapTo(lat, lng, level) {
    if (!mapInstance) return;
    if (level) mapInstance.setLevel(level);
    mapInstance.setCenter(new kakao.maps.LatLng(lat, lng));
}
