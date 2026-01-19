// ===== User Interface Management =====
// Handles UI rendering, event listeners, and user interactions including store list display,
// geolocation requests, store filtering, and location button positioning

import { getAllStoresWithCoords } from './stores.js';
import { centerMapTo, getClusterer, getMap } from './map.js';
import { getAdjustedBounds, isInAdjustedBounds, escapeHtml } from './utils.js';

// Initialize UI elements and attach event listeners for search, filtering, and geolocation
export function initUI() {
    // Attach event listeners to search input for real-time store filtering
    document.getElementById('search-name').addEventListener('keyup', filterStores);
    // Attach event listener to business group dropdown filter
    document.getElementById('search-business-group').addEventListener('change', filterStores);

    // Attach geolocation button click handler to request user's current location
    var btn = document.getElementById('loc-btn');
    if (btn) btn.addEventListener('click', centerToUser);

    // Initial positioning of location button and reposition on window resize
    positionLocButton();
    window.addEventListener('resize', positionLocButton);
    // Expose functions for inline event handlers in index.html
    window.filterStores = filterStores;
    window.centerToUser = centerToUser;
}

// Geolocation helpers: track user location state and handle geolocation permission prompts
let userLocation = null;
let geolocationPromptShown = false;

// Request user's geolocation via browser API and cache the result
// callback: function(err, location) - called with error or location object {lat, lng}
function requestGeolocationOnDemand(callback) {
    if (!navigator.geolocation) {
        callback && callback(new Error('Geolocation not supported'));
        return;
    }
    // Request high accuracy disabled for faster response and reduced battery drain
    navigator.geolocation.getCurrentPosition(function(pos) {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        callback && callback(null, userLocation);
    }, function(err) {
        callback && callback(err);
    }, { enableHighAccuracy: false, timeout: 5000 });
}

// Handle location button click: request geolocation if not yet prompted, then center map on user
export function centerToUser() {
    if (!geolocationPromptShown) {
        // First click: show permission prompt and store the result for future clicks
        geolocationPromptShown = true;
        requestGeolocationOnDemand(function(err, loc) {
            if (err) {
                alert('위치 정보를 사용할 수 없습니다: ' + (err.message || err.code || 'unknown'));
                return;
            }
            positionLocButton();
            var btn = document.getElementById('loc-btn');
            if (btn) btn.style.display = 'block';
            centerUserInAdjustedArea(loc);
        });
        return;
    }

    // User has already granted permission: use cached location or request new one
    if (userLocation) {
        centerUserInAdjustedArea(userLocation);
        return;
    }

    // Fallback: request geolocation again if not cached
    requestGeolocationOnDemand(function(err, loc) {
        if (err) { alert('위치 정보를 사용할 수 없습니다: ' + (err.message || err.code || 'unknown')); return; }
        centerUserInAdjustedArea(loc);
    });
}

// User location marker on the map
let userMarker = null;

// Center the map on user location while accounting for UI panels (top-bar, bottom-sheet)
// Adjusts map center by the offset between user location and adjusted visible area center
function centerUserInAdjustedArea(loc) {
    var adj = getAdjustedBounds();
    if (!adj) {
        // If adjusted bounds unavailable (map not fully loaded), center normally
        centerMapTo(loc.lat, loc.lng, 4);
        return;
    }

    // Calculate the center of the adjusted visible area (excluding UI panels)
    var adjCenterLat = (adj.sw.getLat() + adj.ne.getLat()) / 2;
    var adjCenterLng = (adj.sw.getLng() + adj.ne.getLng()) / 2;

    // Get current map center and apply offset to position user location at adjusted area center
    var mapInstance = getMap();
    var currentCenter = mapInstance.getCenter();
    var newCenterLat = currentCenter.getLat() + (loc.lat - adjCenterLat);
    var newCenterLng = currentCenter.getLng() + (loc.lng - adjCenterLng);

    centerMapTo(newCenterLat, newCenterLng, 4);

    // Remove previous user marker and place new one at current location
    if (userMarker) userMarker.setMap(null);
    var userPos = new kakao.maps.LatLng(loc.lat, loc.lng);
    userMarker = new kakao.maps.Marker({ position: userPos, map: mapInstance });
}

// Render store list in the bottom sheet with given stores array
// Each store item is interactive: click to center map on that store
export function renderStoreList(stores) {
    const storeList = document.getElementById('store-list');
    storeList.innerHTML = '';
    storeList.style.maxHeight = 'calc(40vh - 24px)';
    storeList.style.overflowY = 'auto';

    // Create a section element for each store with name, location, and business group
    stores.forEach(function (store) {
        var storeInfoSection = document.createElement("section");
        storeInfoSection.className = 'store-info';
        storeInfoSection.tabIndex = "0";

        // Click handler: center map on the selected store
        storeInfoSection.addEventListener("mouseup", function() {
            if (store.lat && store.lng) {
                centerMapTo(store.lat, store.lng, 4);
            }
        });

        // Store name with HTML escaping to prevent XSS
        var storeNameDiv = document.createElement("div");
        storeNameDiv.className = 'store-name';
        storeNameDiv.innerHTML = escapeHtml(store.name);
        storeInfoSection.appendChild(storeNameDiv);

        // Store location with HTML escaping
        var storeLocationDiv = document.createElement("div");
        storeLocationDiv.className = 'store-location';
        storeLocationDiv.innerHTML = escapeHtml(store.location);
        storeInfoSection.appendChild(storeLocationDiv);

        // Store business group/category with HTML escaping
        var storeBusinessGroupDiv = document.createElement("div");
        storeBusinessGroupDiv.className = 'store-business-group';
        storeBusinessGroupDiv.innerHTML = escapeHtml(store.businessGroup);
        storeInfoSection.appendChild(storeBusinessGroupDiv);

        storeList.appendChild(storeInfoSection);
    });
}

// Populate the business group dropdown filter with unique categories from the provided groups array
export function populateBusinessGroupSelect(groups) {
    var businessGroupList = document.getElementById('search-business-group');
    businessGroupList.innerHTML = '<option value="">업종 선택</option>';
    const set = new Set(groups.sort());

    set.forEach(function (item) {
        if (!item) return;
        var option = document.createElement('option');
        option.value = item;
        option.text = item;
        businessGroupList.add(option, null);
    });
}

// Update and render store list showing only stores within the current visible map area
export function updateVisibleStoreList() {
    const all = getAllStoresWithCoords();
    if (!all || all.length === 0) return;
    var adj = getAdjustedBounds();
    if (!adj) return;

    // Filter stores to only those within the adjusted visible bounds
    var visible = all.filter(function(s) {
        return isInAdjustedBounds(s.lat, s.lng);
    });

    renderStoreList(visible);
}

// Position the location button based on the visible map area adjusted for UI panels
// Calculates button position to avoid overlapping with bottom sheet
export function positionLocButton() {
    var btn = document.getElementById('loc-btn');
    if (!btn) return;
    var adj = getAdjustedBounds();
    var bottomSheet = document.getElementById('bottom-sheet');
    var mapDiv = document.getElementById('map');
    var mapRect = mapDiv.getBoundingClientRect();

    // Fallback: position button above bottom sheet if adjusted bounds unavailable
    if (!adj) {
        btn.style.bottom = (bottomSheet.offsetHeight + 16) + 'px';
        return;
    }
    
    // Get full map bounds and calculate position based on adjusted visible area
    var mapInstance = getMap();
    var fullBounds = mapInstance ? mapInstance.getBounds() : null;
    if (!fullBounds) { btn.style.bottom = (bottomSheet.offsetHeight + 16) + 'px'; return; }

    // Calculate latitude span and determine button position based on adjusted bottom bound
    var fullNe = fullBounds.getNorthEast();
    var fullSw = fullBounds.getSouthWest();
    var fullLatSpan = fullNe.getLat() - fullSw.getLat();

    var adjBottomLat = adj.sw.getLat();
    var fracFromTop = (fullNe.getLat() - adjBottomLat) / fullLatSpan;
    var y = mapRect.top + fracFromTop * mapRect.height;

    // Set button position accounting for window height and padding
    var bottomPx = window.innerHeight - y + 12;
    btn.style.bottom = bottomPx + 'px';
    btn.style.right = '20px';
}

// Filter store list based on search name and selected business group
// Compares store info against search criteria and shows/hides matching elements
export function filterStores() {
    var storeList = document.getElementsByClassName('store-info');
    var searchName = document.getElementById('search-name').value.toUpperCase();
    var selectedBusinessGroup = document.getElementById('search-business-group').value;

    // Iterate through all store elements and check if they match search criteria
    Array.from(storeList).forEach(function (storeEl) {
        var name = storeEl.getElementsByClassName('store-name')[0].innerHTML.toUpperCase();
        var businessGroup = storeEl.getElementsByClassName('store-business-group')[0].innerHTML;

        // Show store if name contains search text AND business group matches (or no group selected)
        if (name.indexOf(searchName) > -1 && (!selectedBusinessGroup || businessGroup === selectedBusinessGroup)) {
            storeEl.style.display = "block";
        } else {
            storeEl.style.display = "none";
        }
    });
}
