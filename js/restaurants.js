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
const geocodeCache = {};
let restaurantMarkers = [];

document.addEventListener("DOMContentLoaded", () => {
  populateFilters();
  fetchRestaurants();

  // ✅ Updated: Apply Filters + Save to localStorage
  document.getElementById("applyFiltersBtn").addEventListener("click", () => {
    const selectedAllergies = getCheckedValues("allergy");
    const selectedCuisines = getCheckedValues("cuisine");
    const selectedDiets = getCheckedValues("diet");

    // Save preferences
    localStorage.setItem("safeserveUserPrefs", JSON.stringify({
      allergies: selectedAllergies,
      cuisines: selectedCuisines,
      diets: selectedDiets
    }));

    fetchRestaurants(selectedAllergies, selectedCuisines, selectedDiets);
    if (mapInitialized) loadRestaurantsOnMap(staticRestaurants);
  });

  // ✅ Already working: Use saved prefs
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

    fetchRestaurants([...allergySet], [...cuisineSet], [...dietSet]);
    if (mapInitialized) loadRestaurantsOnMap(staticRestaurants);
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
          const bbox = e.geocode.bbox;
          const bounds = [
            [bbox.getSouthWest().lat, bbox.getSouthWest().lng],
            [bbox.getNorthEast().lat, bbox.getNorthEast().lng]
          ];
          map.fitBounds(bounds);
          L.marker(e.geocode.center).addTo(map).bindPopup(e.geocode.name).openPopup();
        })
        .addTo(map);

      navigator.geolocation.getCurrentPosition(pos => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 14);
        L.marker([pos.coords.latitude, pos.coords.longitude])
          .addTo(map)
          .bindPopup('You are here')
          .openPopup();
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

  allergenOptions.forEach(option => {
    allergyDiv.appendChild(createCheckbox("allergy", option));
  });
  cuisineOptions.forEach(option => {
    cuisineDiv.appendChild(createCheckbox("cuisine", option));
  });
  dietOptions.forEach(option => {
    dietDiv.appendChild(createCheckbox("diet", option));
  });
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

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
    .map(cb => cb.value.toLowerCase());
}

function fetchRestaurants(allergies = [], cuisines = [], diets = []) {
  const resultBox = document.querySelector(".resultbox");
  resultBox.innerHTML = `<h2 style="padding-left: 15px;">Loading...</h2>`;

  const restaurants = staticRestaurants.filter(data => {
    const safeAllergies = (data.safeFor || []).map(a => a.trim().toLowerCase());
    const cuisine = (data.cuisine || "").toLowerCase();
    const tags = safeAllergies;

    const matchAllergies = allergies.length === 0 || allergies.some(a => safeAllergies.includes(a));
    const matchCuisine = cuisines.length === 0 || cuisines.includes(cuisine);
    const matchDiet = diets.length === 0 || diets.some(d => tags.includes(d));
    
    if (!(matchAllergies || matchCuisine || matchDiet)) return false;
    return true;    
  });

  if (restaurants.length === 0) {
    resultBox.innerHTML = `<h2 style="padding-left: 15px;">No matching restaurants found.</h2>`;
    return;
  }

  resultBox.innerHTML = "";
  restaurants.forEach(r => {
    const card = document.createElement("div");
    card.className = "restaurant-card";
    card.innerHTML = `
      <img src="${r.image || 'https://via.placeholder.com/200x150'}" alt="${r.name}">
      <div class="restaurant-info">
        <h3>${r.name}</h3>
        <p><strong>Location:</strong> ${r.location}</p>
        <p><strong>Cuisine:</strong> ${r.cuisine}</p>
        <p class="rating"><strong>Rating:</strong> ⭐ ${r.rating}</p>
        <p><strong>Safe for:</strong> ${r.safeFor?.join(", ") || "None"}</p>
        <a href="${r.link || '#'}" target="_blank" class="view-button">View Restaurant</a>
      </div>
    `;
    resultBox.appendChild(card);
  });
}

function clearMapMarkers() {
  restaurantMarkers.forEach(marker => marker.remove());
  restaurantMarkers = [];
}

async function geocodeAddress(address) {
  if (geocodeCache[address]) return geocodeCache[address];
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&email=safe.serve@example.com`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.length > 0) {
    const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    geocodeCache[address] = coords;
    await new Promise(r => setTimeout(r, 1100)); // delay for Nominatim
    return coords;
  }
  return null;
}

async function loadRestaurantsOnMap(restaurantsToShow = staticRestaurants) {
  if (!map) return; // prevent error if map is not initialized
  clearMapMarkers();
  for (const data of restaurantsToShow) {
    const coords = await geocodeAddress(data.location);
    if (!coords) continue;

    const safeForStr = (data.safeFor || []).join(', ');
    const popupHtml = `
      <strong>${data.name}</strong><br/>
      ${data.cuisine}<br/>
      Rating: ${data.rating}<br/>
      Safe For: ${safeForStr}<br/>
      <a href="${data.link}" target="_blank">Visit Website</a>
    `;
    const marker = L.marker([coords.lat, coords.lon]).addTo(map).bindPopup(popupHtml);
    restaurantMarkers.push(marker);
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

