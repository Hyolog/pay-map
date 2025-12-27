import { initMap, onMapIdle, onMapZoomChanged } from './map.js';
import { fetchStoresAndGeocode, getAllStoresWithCoords } from './stores.js';
import { initUI, renderStoreList, populateBusinessGroupSelect, updateVisibleStoreList as uiUpdateVisible } from './ui.js';

export async function init() {
    initMap('map');

    initUI();

    try { document.getElementById('loading').style.display = 'flex'; } catch (e) {}
    let stores = [];
    try {
        stores = await fetchStoresAndGeocode();
    } finally {
        try { document.getElementById('loading').style.display = 'none'; } catch (e) {}
    }

    populateBusinessGroupSelect(stores.map(s => s.businessGroup));

    renderStoreList(getAllStoresWithCoords());

    onMapIdle(() => uiUpdateVisible());
    onMapZoomChanged(() => uiUpdateVisible());
}

window.addEventListener('DOMContentLoaded', function() {
    init().catch(err => console.error('App init failed', err));
});
