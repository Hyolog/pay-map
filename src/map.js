// ===== Map Management =====
// Manages Kakao Map initialization, marker clustering, and map controls

// Global references to the map instance and marker clusterer
let mapInstance = null;
let clusterer = null;

// Initialize the Kakao Map with controls and settings
// Initial center: Yongin City Hall (37.2415, 127.1775), zoom level 8
export function initMap(containerId) {
    const mapContainer = document.getElementById(containerId);
    const mapOption = { center: new kakao.maps.LatLng(37.2415, 127.1775), level: 8 };
    mapInstance = new kakao.maps.Map(mapContainer, mapOption);

    // Add map type control (Satellite, Terrain, etc.) at top right
    const mapTypeControl = new kakao.maps.MapTypeControl();
    mapInstance.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
    
    // Add zoom in/out control on the right side
    const zoomControl = new kakao.maps.ZoomControl();
    mapInstance.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    // Initialize marker clusterer to group nearby markers for performance
    clusterer = new kakao.maps.MarkerClusterer({ map: mapInstance, averageCenter: true, minLevel: 5 });
}

// Return the map instance for use in other modules
export function getMap() { 
    return mapInstance; 
}

// Register a callback function that fires when the map finishes panning/zooming
export function onMapIdle(cb) { 
    if (mapInstance) kakao.maps.event.addListener(mapInstance, 'idle', cb); 
}

// Register a callback function that fires when the map zoom level changes
export function onMapZoomChanged(cb) { 
    if (mapInstance) kakao.maps.event.addListener(mapInstance, 'zoom_changed', cb); 
}

// Remove markers from the map
export function clearMarkers(markersGlobal) {
    markersGlobal.forEach(m => { 
        try { 
            if (m.marker) m.marker.setMap(null); 
            else if (m.setMap) m.setMap(null); 
        } catch(e){} 
    });
}

// Add markers to the clusterer for grouped display
export function addMarkersToCluster(markers) {
    if (clusterer) clusterer.addMarkers(markers);
}

// Return the marker clusterer instance
export function getClusterer() { 
    return clusterer; 
}

// Center the map to a specific latitude and longitude with optional zoom level
export function centerMapTo(lat, lng, level) {
    if (!mapInstance) return;
    if (level) mapInstance.setLevel(level);
    mapInstance.setCenter(new kakao.maps.LatLng(lat, lng));
}

// Get the current map bounds for filtering stores by visible area
export function getMapBounds() {
    if (!mapInstance) return null;
    return mapInstance.getBounds();
}
