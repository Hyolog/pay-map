// ===== Store Data Management =====
// Fetches store data from government API, geocodes addresses, and manages marker placement

import { addMarkersToCluster, clearMarkers, getClusterer } from './map.js';
import { SERVICE_KEY } from './apikey.js';

// Global array to store all stores with their coordinates
let allStoresWithCoords = [];

// Fetch store data from the government API and geocode their addresses
// Returns array of stores with name, location, and business category
export async function fetchStoresAndGeocode() {
    const NUM_OF_ROWS = 1000;  // Fetch up to 1000 stores
    const PAGE_NO = 1;          // First page of results

    // Validate that the API key is available
    if (!SERVICE_KEY) {
        console.error('SERVICE_KEY is missing');
        return [];
    }

    // Build the API request URL
    const url = new URL('https://apis.data.go.kr/4050000/ypay/getYpay');
    url.searchParams.set('serviceKey', SERVICE_KEY);
    url.searchParams.set('numOfRows', NUM_OF_ROWS);
    url.searchParams.set('pageNo', PAGE_NO);

    try {
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Network error ' + res.status);
        const json = await res.json();
        const items = Array.isArray(json.items) ? json.items : [];
        
        // Parse store data: extract name, location, and business category
        const stores = items.map(it => ({ 
            name: it.aflt_nm || '', 
            location: it.addr || '', 
            businessGroup: it.fld || '' 
        }))
        // Filter out stores with invalid addresses
        .filter(s => s.location && s.location.trim().length > 0)
        // Sort alphabetically by name for consistent display
        .sort((a,b) => a.name.localeCompare(b.name));

        // Convert addresses to geographic coordinates and cache results
        await geocodeStores(stores);
        return stores;
    } catch (e) {
        console.error('fetchStoresAndGeocode error', e);
        return [];
    }
}

// Convert store addresses to geographic coordinates
// Uses Kakao Geocoder API with localStorage caching for performance
async function geocodeStores(stores) {
    console.time('geocodeStores');
    const geocoder = new kakao.maps.services.Geocoder();
    const coords = {};
    const chunkSize = 50;          // Process 50 stores at a time to avoid API rate limits
    const requestInterval = 50;    // Wait 50ms between batch requests

    // Process stores in chunks to respect API rate limits
    for (let i = 0; i < stores.length; i += chunkSize) {
        const chunk = stores.slice(i, i+chunkSize);
        
        // Geocode all stores in the current chunk in parallel
        await Promise.all(chunk.map(s => new Promise((resolve) => {
            const cacheKey = 'geo_' + encodeURIComponent(s.location);
            
            // Check if coordinates are already cached in browser storage
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    coords[s.location] = JSON.parse(cached);
                    return resolve();
                }
            } catch(e) {}

            // Request geocoding from Kakao API
            geocoder.addressSearch(s.location, function(data, status) {
                if (status === kakao.maps.services.Status.OK) {
                    coords[s.location] = data[0];
                    // Cache the result for future use
                    try { 
                        localStorage.setItem(cacheKey, JSON.stringify(data[0])); 
                    } catch(e){}
                } else {
                    console.warn('geocode failed', s.location, status);
                }
                resolve();
            });
        })));
        
        // Add delay between batch requests to avoid overwhelming the API
        await new Promise(r => setTimeout(r, requestInterval));
    }

    // Build final store list with coordinates
    allStoresWithCoords = stores.filter(s => coords[s.location]).map(s => ({
        name: s.name,
        location: s.location,
        businessGroup: s.businessGroup,
        lat: coords[s.location].y,
        lng: coords[s.location].x
    }));

    // Create markers for all stores and add them to the map clusterer
    const markers = allStoresWithCoords.map(s => new kakao.maps.Marker({ 
        position: new kakao.maps.LatLng(s.lat, s.lng) 
    }));
    clearMarkers([]); // Ensure map is clean before adding new markers
    addMarkersToCluster(markers);

    console.log(stores.length);
    console.timeEnd('geocodeStores');
}

// Return all stores with their geographic coordinates
export function getAllStoresWithCoords() { 
    return allStoresWithCoords; 
}
