// ===== Application Initialization =====
// Main entry point that orchestrates the initialization of the map, UI, and store data

import { initMap, onMapIdle, onMapZoomChanged } from './map.js';
import { fetchStoresAndGeocode, getAllStoresWithCoords } from './stores.js';
import { initUI, renderStoreList, populateBusinessGroupSelect, updateVisibleStoreList as uiUpdateVisible } from './ui.js';

// Initialize the entire application
// Steps: 1. Create map, 2. Setup UI components, 3. Fetch and geocode stores, 4. Populate dropdowns and list
export async function init() {
    // Initialize the map with Kakao Maps
    initMap('map');

    // Initialize UI event listeners and controls
    initUI();

    // Show loading indicator
    try { 
        document.getElementById('loading').style.display = 'flex'; 
    } catch (e) {}
    
    let stores = [];
    try {
        // Fetch store data from the government API and geocode each store's address
        stores = await fetchStoresAndGeocode();
    } finally {
        // Hide loading indicator after data is fetched
        try { 
            document.getElementById('loading').style.display = 'none'; 
        } catch (e) {}
    }

    // Populate the business category dropdown with unique categories
    populateBusinessGroupSelect(stores.map(s => s.businessGroup));

    // Display all stores with coordinates in the store list
    renderStoreList(getAllStoresWithCoords());

    // Update visible stores when map is idle or zoom level changes
    onMapIdle(() => uiUpdateVisible());
    onMapZoomChanged(() => uiUpdateVisible());
}

// Start the application when the page has fully loaded
window.addEventListener('DOMContentLoaded', function() {
    init().catch(err => console.error('App init failed', err));
});
