import { getAllStoresWithCoords } from './stores.js';
import { centerMapTo, getClusterer, getMap } from './map.js';
import { getAdjustedBounds, isInAdjustedBounds, escapeHtml } from './utils.js';

export function initUI() {
    document.getElementById('search-name').addEventListener('keyup', filterStores);
    document.getElementById('search-business-group').addEventListener('change', filterStores);

    // wire location button
    var btn = document.getElementById('loc-btn');
    if (btn) btn.addEventListener('click', centerToUser);

    // position loc button on load and on resize
    positionLocButton();
    window.addEventListener('resize', positionLocButton);
    // expose functions used by inline handlers in index.html
    window.filterStores = filterStores;
    window.centerToUser = centerToUser;
}

// Geolocation helpers and centering behavior
let userLocation = null;
let geolocationPromptShown = false;

function requestGeolocationOnDemand(callback) {
    if (!navigator.geolocation) {
        callback && callback(new Error('Geolocation not supported'));
        return;
    }
    navigator.geolocation.getCurrentPosition(function(pos) {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        callback && callback(null, userLocation);
    }, function(err) {
        callback && callback(err);
    }, { enableHighAccuracy: false, timeout: 5000 });
}

export function centerToUser() {
    if (!geolocationPromptShown) {
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

    if (userLocation) {
        centerUserInAdjustedArea(userLocation);
        return;
    }

    requestGeolocationOnDemand(function(err, loc) {
        if (err) { alert('위치 정보를 사용할 수 없습니다: ' + (err.message || err.code || 'unknown')); return; }
        centerUserInAdjustedArea(loc);
    });
}

let userMarker = null;
function centerUserInAdjustedArea(loc) {
    var adj = getAdjustedBounds();
    if (!adj) {
        centerMapTo(loc.lat, loc.lng, 4);
        return;
    }

    var adjCenterLat = (adj.sw.getLat() + adj.ne.getLat()) / 2;
    var adjCenterLng = (adj.sw.getLng() + adj.ne.getLng()) / 2;

    var mapInstance = getMap();
    var currentCenter = mapInstance.getCenter();
    var newCenterLat = currentCenter.getLat() + (loc.lat - adjCenterLat);
    var newCenterLng = currentCenter.getLng() + (loc.lng - adjCenterLng);

    centerMapTo(newCenterLat, newCenterLng, 4);

    if (userMarker) userMarker.setMap(null);
    var userPos = new kakao.maps.LatLng(loc.lat, loc.lng);
    userMarker = new kakao.maps.Marker({ position: userPos, map: mapInstance });
}

export function renderStoreList(stores) {
    const storeList = document.getElementById('store-list');
    storeList.innerHTML = '';
    storeList.style.maxHeight = 'calc(40vh - 24px)';
    storeList.style.overflowY = 'auto';

    stores.forEach(function (store) {
        var storeInfoSection = document.createElement("section");
        storeInfoSection.className = 'store-info';
        storeInfoSection.tabIndex = "0";

        storeInfoSection.addEventListener("mouseup", function() {
            if (store.lat && store.lng) {
                centerMapTo(store.lat, store.lng, 4);
            }
        });

        var storeNameDiv = document.createElement("div");
        storeNameDiv.className = 'store-name';
        storeNameDiv.innerHTML = escapeHtml(store.name);
        storeInfoSection.appendChild(storeNameDiv);

        var storeLocationDiv = document.createElement("div");
        storeLocationDiv.className = 'store-location';
        storeLocationDiv.innerHTML = escapeHtml(store.location);
        storeInfoSection.appendChild(storeLocationDiv);

        var storeBusinessGroupDiv = document.createElement("div");
        storeBusinessGroupDiv.className = 'store-business-group';
        storeBusinessGroupDiv.innerHTML = escapeHtml(store.businessGroup);
        storeInfoSection.appendChild(storeBusinessGroupDiv);

        storeList.appendChild(storeInfoSection);
    });
}

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

export function updateVisibleStoreList() {
    const all = getAllStoresWithCoords();
    if (!all || all.length === 0) return;
    var adj = getAdjustedBounds();
    if (!adj) return;

    var visible = all.filter(function(s) {
        return isInAdjustedBounds(s.lat, s.lng);
    });

    renderStoreList(visible);
}

export function positionLocButton() {
    var btn = document.getElementById('loc-btn');
    if (!btn) return;
    var adj = getAdjustedBounds();
    var bottomSheet = document.getElementById('bottom-sheet');
    var mapDiv = document.getElementById('map');
    var mapRect = mapDiv.getBoundingClientRect();

    if (!adj) {
        btn.style.bottom = (bottomSheet.offsetHeight + 16) + 'px';
        return;
    }
    var mapInstance = getMap();
    var fullBounds = mapInstance ? mapInstance.getBounds() : null;
    if (!fullBounds) { btn.style.bottom = (bottomSheet.offsetHeight + 16) + 'px'; return; }

    var fullNe = fullBounds.getNorthEast();
    var fullSw = fullBounds.getSouthWest();
    var fullLatSpan = fullNe.getLat() - fullSw.getLat();

    var adjBottomLat = adj.sw.getLat();
    var fracFromTop = (fullNe.getLat() - adjBottomLat) / fullLatSpan;
    var y = mapRect.top + fracFromTop * mapRect.height;

    var bottomPx = window.innerHeight - y + 12;
    btn.style.bottom = bottomPx + 'px';
    btn.style.right = '20px';
}

export function filterStores() {
    var storeList = document.getElementsByClassName('store-info');
    var searchName = document.getElementById('search-name').value.toUpperCase();
    var selectedBusinessGroup = document.getElementById('search-business-group').value;

    Array.from(storeList).forEach(function (storeEl) {
        var name = storeEl.getElementsByClassName('store-name')[0].innerHTML.toUpperCase();
        var businessGroup = storeEl.getElementsByClassName('store-business-group')[0].innerHTML;

        if (name.indexOf(searchName) > -1 && (!selectedBusinessGroup || businessGroup === selectedBusinessGroup)) {
            storeEl.style.display = "block";
        } else {
            storeEl.style.display = "none";
        }
    });
}
