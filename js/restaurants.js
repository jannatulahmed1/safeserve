import { staticRestaurants } from './static-restaurants.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);

// Filter options
const allergenOptions = [
  "peanut", "tree nut", "nut", "milk", "egg", "wheat", "gluten", "soy",
  "fish", "shellfish", "sesame", "mustard", "sulfite", "corn", "dairy",
  "celery", "yeast", "lupin", "mollusk", "buckwheat", "latex", "other"
];

const cuisineOptions = [
  "italian", "chinese", "indian", "mexican", "thai", "japanese", "american",
  "mediterranean", "korean", "greek", "french", "caribbean", "vietnamese",
  "ethiopian", "turkish", "cuban", "bengali", "dominican", "puerto rican",
  "jamaican", "peruvian", "filipino", "lebanese", "brazilian",
  "nigerian", "ghanaian", "moroccan", "egyptian", "somali", "other"
];

const dietOptions = [
  "vegan", "vegetarian", "pescatarian", "halal",
  "kosher", "low-carb", "low-sodium", "other"
];

// Map variables
let map, mapInitialized = false;
let restaurantMarkers = [];
let userLocationMarker = null; // add this near your other map variables


function getDistanceFromLatLonInMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles. Use 6371 for km if you want
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function updateUserLocationAndRefresh(lat, lng, name = "Your Location") {
  window.lastUserLocation = { lat, lng, name };

  const selectedAllergies = getCheckedValuesById("allergenFilters");
  const selectedCuisines = getCheckedValuesById("cuisineFilters");
  const selectedDiets = getCheckedValuesById("dietFilters");

  const filtered = fetchRestaurants(selectedAllergies, selectedCuisines, selectedDiets);
  loadRestaurantsOnMap(filtered);
}


const greenIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41]
});


document.addEventListener("DOMContentLoaded", () => {
  populateFilters();
  fetchRestaurants();

    // Check for location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      updateUserLocationAndRefresh(pos.coords.latitude, pos.coords.longitude, "Your Location");
    }, err => {
      console.warn("User denied geolocation or error:", err);
    });
  }

  document.getElementById("applyFiltersBtn").addEventListener("click", () => {
    const selectedAllergies = getCheckedValuesById("allergenFilters");
    const selectedCuisines = getCheckedValuesById("cuisineFilters");
    const selectedDiets = getCheckedValuesById("dietFilters");

    localStorage.setItem("safeserveUserPrefs", JSON.stringify({
      allergies: selectedAllergies,
      cuisines: selectedCuisines,
      diets: selectedDiets
    }));

    const filtered = fetchRestaurants(selectedAllergies, selectedCuisines, selectedDiets);
    if (mapInitialized) loadRestaurantsOnMap(filtered);
  });

  document.getElementById("useSavedPrefsBtn").addEventListener("click", () => {
    const prefs = JSON.parse(localStorage.getItem("safeserveUserPrefs") || "{}");
    const allergySet = new Set((prefs.allergies || []).map(a => a.toLowerCase()));
    const cuisineSet = new Set((prefs.cuisines || []).map(c => c.toLowerCase()));
    const dietSet = new Set((prefs.diets || []).map(d => d.toLowerCase()));

    document.querySelectorAll('input[name="allergy"]').forEach(cb => {
      cb.checked = allergySet.has(cb.value.toLowerCase());
    });
    document.querySelectorAll('input[name="cuisine"]').forEach(cb => {
      cb.checked = cuisineSet.has(cb.value.toLowerCase());
    });
    document.querySelectorAll('input[name="diet"]').forEach(cb => {
      cb.checked = dietSet.has(cb.value.toLowerCase());
    });

    const filtered = fetchRestaurants([...allergySet], [...cuisineSet], [...dietSet]);
    if (mapInitialized) loadRestaurantsOnMap(filtered);
  });

  document.getElementById("openMapBtn").addEventListener("click", () => {
    const mapContainer = document.getElementById("map");
    const isVisible = mapContainer.style.display === 'block';
    mapContainer.style.display = isVisible ? 'none' : 'block';
    document.getElementById("openMapBtn").textContent = isVisible ? 'Search by Location' : 'Hide Map';

    if (!mapInitialized && !isVisible) {
      map = L.map('map').setView([40.7128, -74.0060], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

L.Control.geocoder({ defaultMarkGeocode: false })
.on('markgeocode', e => {
  const geocode = e.geocode;
  const center = geocode.center;
  const name = geocode.name;
  const bbox = geocode.bbox;

 // Remove previous user location marker if any
if (userLocationMarker) {
  map.removeLayer(userLocationMarker);
}

// Zoom map to location bounds and add marker with popup
const bounds = [
  [bbox.getSouthWest().lat, bbox.getSouthWest().lng],
  [bbox.getNorthEast().lat, bbox.getNorthEast().lng]
];
map.fitBounds(bounds);

userLocationMarker = L.marker(center, {icon: greenIcon}).addTo(map).bindPopup(name).openPopup();

// Use helper to update location and refresh UI
updateUserLocationAndRefresh(center.lat, center.lng, name);

})

  .addTo(map);



navigator.geolocation.getCurrentPosition(pos => {
if (userLocationMarker) {
  map.removeLayer(userLocationMarker);
}
const userLatLng = [pos.coords.latitude, pos.coords.longitude];
userLocationMarker = L.marker(userLatLng, {icon: greenIcon})
  .addTo(map)
  .bindPopup('You are here')
  .openPopup();
map.setView(userLatLng, 14);

// Use helper to update location and refresh UI
updateUserLocationAndRefresh(pos.coords.latitude, pos.coords.longitude, "Your Location");

});


      loadRestaurantsOnMap(staticRestaurants);
      mapInitialized = true;
    } else {
      setTimeout(() => map.invalidateSize(), 100);
    }
  });
});

function populateFilters() {
  const allergyDiv = document.getElementById("allergenFilters");
  const cuisineDiv = document.getElementById("cuisineFilters");
  const dietDiv = document.getElementById("dietFilters");

  allergenOptions.forEach(option => allergyDiv.appendChild(createCheckbox("allergy", option)));
  cuisineOptions.forEach(option => cuisineDiv.appendChild(createCheckbox("cuisine", option)));
  dietOptions.forEach(option => dietDiv.appendChild(createCheckbox("diet", option)));
}

function createCheckbox(name, value) {
  const label = document.createElement("label");
  label.style.display = "inline-flex";
  label.style.alignItems = "center";
  label.style.margin = "5px 10px 5px 0";
  label.style.fontSize = "14px";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.name = name;
  checkbox.value = value;
  checkbox.style.marginRight = "6px";

  const text = document.createTextNode(capitalize(value));
  label.appendChild(checkbox);
  label.appendChild(text);

  return label;
}

function getCheckedValuesById(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`))
    .map(cb => cb.value.toLowerCase());
}

function fetchRestaurants(selectedAllergies = [], selectedCuisines = [], selectedDiets = []) {
  const resultsContainer = document.getElementById("restaurantResults");
const locationRefContainer = document.getElementById("locationReference");

if (window.lastUserLocation && window.lastUserLocation.name) {
  const fullName = window.lastUserLocation.name;
  const truncatedName = fullName;
  locationRefContainer.textContent = `Restaurants Near: ${truncatedName}`;
} else {
  locationRefContainer.textContent = `Restaurants Near: No Location Found`;
}


  resultsContainer.innerHTML = "";

  const userLoc = window.lastUserLocation;

  const filtered = staticRestaurants.filter(restaurant => {
    const safeForList = (restaurant.safeFor || []).map(s => s.toLowerCase());
    const cuisine = (restaurant.cuisine || "").toLowerCase();
    const allergyMatch = selectedAllergies.every(a => safeForList.includes(a));
    const dietMatch = selectedDiets.every(d => safeForList.includes(d));
    const cuisineMatch = selectedCuisines.length === 0 || selectedCuisines.includes(cuisine);
    return allergyMatch && cuisineMatch && dietMatch;
  });

  if (filtered.length === 0) {
    resultsContainer.innerHTML = `<p>No matching restaurants found.</p>`;
    return [];
  }

  if (userLoc) {
    // Build array of index-distance pairs
    const distancePairs = filtered.map((restaurant, idx) => {
      let distance = Infinity;
      if (restaurant.coordinates && restaurant.coordinates.lat != null && restaurant.coordinates.lon != null) {
        distance = getDistanceFromLatLonInMiles(
          userLoc.lat,
          userLoc.lng,
          restaurant.coordinates.lat,
          restaurant.coordinates.lon
        );
      }
      return { idx, distance };
    });

    // Sort by distance ascending
    distancePairs.sort((a, b) => a.distance - b.distance);

    // Render restaurants in distance order
    distancePairs.forEach(({ idx, distance }) => {
      const restaurant = filtered[idx];
      const distanceStr = isFinite(distance) ? `<p><strong>Distance:</strong> ${distance.toFixed(2)} miles</p>` : "";

      const card = document.createElement("div");
      card.className = "restaurant-card";
      card.innerHTML = `
        <img src="${restaurant.image}" alt="${restaurant.name}">
        <div class="restaurant-info">
          <h3>${restaurant.name}</h3>
          <p><strong>Address:</strong> ${restaurant.location}</p>
          <p><strong>Cuisine:</strong> ${restaurant.cuisine}</p>
          <p><strong>Safe For:</strong> ${restaurant.safeFor.join(", ")}</p>
          <p class="rating">Rating: ${restaurant.rating}</p>
          ${distanceStr}
          <a class="view-button" href="${restaurant.link}" target="_blank">View Restaurant</a>
        </div>
      `;
      resultsContainer.appendChild(card);
    });

  } else {
    // No user location — render filtered as is
    filtered.forEach(restaurant => {
      let distanceStr = "";
      const card = document.createElement("div");
      card.className = "restaurant-card";
      card.innerHTML = `
        <img src="${restaurant.image}" alt="${restaurant.name}">
        <div class="restaurant-info">
          <h3>${restaurant.name}</h3>
          <p><strong>Address:</strong> ${restaurant.location}</p>
          <p><strong>Cuisine:</strong> ${restaurant.cuisine}</p>
          <p><strong>Safe For:</strong> ${restaurant.safeFor.join(", ")}</p>
          <p class="rating">Rating: ${restaurant.rating}</p>
          ${distanceStr}
          <a class="view-button" href="${restaurant.link}" target="_blank">View Restaurant</a>
        </div>
      `;
      resultsContainer.appendChild(card);
    });
  }

  return filtered;
}



function clearMapMarkers() {
  restaurantMarkers.forEach(marker => marker.remove());
  restaurantMarkers = [];
}

function loadRestaurantsOnMap(restaurantsToShow = staticRestaurants) {
  if (!map) return;
  clearMapMarkers();

  const userLoc = window.lastUserLocation;

  restaurantsToShow.forEach(data => {
    const coords = data.coordinates; // must be {lat, lon}
    if (!coords || coords.lat == null || coords.lon == null) return;

    // Calculate distance if user location exists
    let distanceText = "";
    if (userLoc) {
      const dist = getDistanceFromLatLonInMiles(
        userLoc.lat,
        userLoc.lng,
        coords.lat,
        coords.lon
      );
      distanceText = `<br/><strong>Distance:</strong> ${dist.toFixed(2)} miles`;
    }

    const safeForStr = (data.safeFor || []).join(', ');
    const popupHtml = `
      <strong>${data.name}</strong><br/>
      ${data.cuisine}<br/>
      Rating: ${data.rating}<br/>
      Safe For: ${safeForStr}
      ${distanceText}
      <br/><a href="${data.link}" target="_blank">Visit Website</a>
    `;

    const marker = L.marker([coords.lat, coords.lon])
      .addTo(map)
      .bindPopup(popupHtml);

    restaurantMarkers.push(marker);
  });
}


function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
