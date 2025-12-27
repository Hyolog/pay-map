import { addMarkersToCluster, clearMarkers, getClusterer } from './map.js';
import { SERVICE_KEY } from './apikey.js';

let allStoresWithCoords = [];

export async function fetchStoresAndGeocode() {
    const NUM_OF_ROWS = 1000;
    const PAGE_NO = 1;

    if (!SERVICE_KEY) {
        console.error('SERVICE_KEY is missing');
        return [];
    }

    const url = new URL('https://apis.data.go.kr/4050000/ypay/getYpay');
    url.searchParams.set('serviceKey', SERVICE_KEY);
    url.searchParams.set('numOfRows', NUM_OF_ROWS);
    url.searchParams.set('pageNo', PAGE_NO);

    try {
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Network error ' + res.status);
        const json = await res.json();
        const items = Array.isArray(json.items) ? json.items : [];
        const stores = items.map(it => ({ name: it.aflt_nm || '', location: it.addr || '', businessGroup: it.fld || '' }))
            .filter(s => s.location && s.location.trim().length > 0)
            .sort((a,b) => a.name.localeCompare(b.name));

        // geocode in batches and build allStoresWithCoords
        await geocodeStores(stores);
        return stores;
    } catch (e) {
        console.error('fetchStoresAndGeocode error', e);
        return [];
    }
}

async function geocodeStores(stores) {
    console.time('geocodeStores');
    const geocoder = new kakao.maps.services.Geocoder();
    const coords = {};
    const chunkSize = 50;
    const requestInterval = 50;

    for (let i = 0; i < stores.length; i += chunkSize) {
        const chunk = stores.slice(i, i+chunkSize);
        await Promise.all(chunk.map(s => new Promise((resolve) => {
            const cacheKey = 'geo_' + encodeURIComponent(s.location);
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    coords[s.location] = JSON.parse(cached);
                    return resolve();
                }
            } catch(e) {}

            geocoder.addressSearch(s.location, function(data, status) {
                if (status === kakao.maps.services.Status.OK) {
                    coords[s.location] = data[0];
                    try { localStorage.setItem(cacheKey, JSON.stringify(data[0])); } catch(e){}
                } else {
                    console.warn('geocode failed', s.location, status);
                }
                resolve();
            });
        })));
        // small delay between batches
        await new Promise(r => setTimeout(r, requestInterval));
    }

    allStoresWithCoords = stores.filter(s => coords[s.location]).map(s => ({
        name: s.name,
        location: s.location,
        businessGroup: s.businessGroup,
        lat: coords[s.location].y,
        lng: coords[s.location].x
    }));

    // add markers for all stores
    const markers = allStoresWithCoords.map(s => new kakao.maps.Marker({ position: new kakao.maps.LatLng(s.lat, s.lng) }));
    clearMarkers([]); // no-op fallback
    addMarkersToCluster(markers);

    console.log(stores.length);
    console.timeEnd('geocodeStores');
}

export function getAllStoresWithCoords() { return allStoresWithCoords; }
