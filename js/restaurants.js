// js/restaurants.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Filter values
const allergenOptions = [
  "peanut", "almond", "milk", "egg", "salmon", "tuna", "walnut",
  "cashew", "pistachio", "hazelnut", "shrimp", "wheat", "gluten",
  "crab", "lobster", "oats", "corn", "sesame", "soy",
  "avocado", "chickpeas", "banana"
];

const cuisineOptions = [
  "italian", "chinese", "indian", "mexican", "thai",
  "japanese", "american", "mediterranean", "korean",
  "middle-eastern", "greek", "french", "caribbean",
  "vietnamese", "ethiopian"
];

const dietOptions = [
  "vegan", "vegetarian", "pescatarian", "halal",
  "kosher", "low-carb", "low-sodium"
];

window.addEventListener("DOMContentLoaded", () => {
  const applyBtn = document.getElementById("applyFiltersBtn");
  const useSaved = document.getElementById("useSavedPrefs");

  populateFilters();
  fetchRestaurants();

  applyBtn.addEventListener("click", () => {
    let selectedAllergies = Array.from(
      document.querySelectorAll('input[name="allergy"]:checked')
    ).map(cb => cb.value.toLowerCase());

    if (useSaved?.checked) {
      const saved = JSON.parse(localStorage.getItem("savedAllergies") || "[]");
      selectedAllergies = [...new Set([...selectedAllergies, ...saved.map(s => s.toLowerCase())])];
    }

    const selectedCuisines = Array.from(
      document.querySelectorAll('input[name="cuisine"]:checked')
    ).map(cb => cb.value.toLowerCase());

    const selectedDiets = Array.from(
      document.querySelectorAll('input[name="diet"]:checked')
    ).map(cb => cb.value.toLowerCase());

    fetchRestaurants(selectedAllergies, selectedCuisines, selectedDiets);
  });
});

function populateFilters() {
  const allergyDiv = document.getElementById("allergenFilters");
  const cuisineDiv = document.getElementById("cuisineFilters");
  const dietDiv = document.getElementById("dietFilters");

  allergenOptions.forEach(option => {
    const input = `<input type="checkbox" id="${option}" name="allergy" value="${option}"><label for="${option}">${capitalize(option)}</label>`;
    allergyDiv.insertAdjacentHTML("beforeend", input);
  });
  cuisineOptions.forEach(option => {
    const input = `<input type="checkbox" id="${option}" name="cuisine" value="${option}"><label for="${option}">${capitalize(option)}</label>`;
    cuisineDiv.insertAdjacentHTML("beforeend", input);
  });
  dietOptions.forEach(option => {
    const input = `<input type="checkbox" id="${option}" name="diet" value="${option}"><label for="${option}">${capitalize(option)}</label>`;
    dietDiv.insertAdjacentHTML("beforeend", input);
  });
}

async function fetchRestaurants(allergies = [], cuisines = [], diets = []) {
  const resultBox = document.querySelector(".resultbox");
  resultBox.innerHTML = `<h2 style="padding-left: 15px;">Loading...</h2>`;

  try {
    const snapshot = await getDocs(collection(db, "restaurants"));
    const restaurants = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const safeAllergies = (data.safeFor || []).map(a => a.trim().toLowerCase());
      const cuisine = (data.cuisine || "").toLowerCase();
      const tags = (data.safeFor || []).map(t => t.trim().toLowerCase()); // changed from data.tags

      const matchAllergies = allergies.length === 0 || allergies.every(a => safeAllergies.includes(a));
      const matchCuisine = cuisines.length === 0 || cuisines.includes(cuisine);
      const matchDiet = diets.length === 0 || diets.some(d => tags.includes(d));

      if (matchAllergies && matchCuisine && matchDiet) {
        restaurants.push(data);
      }
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
        <img src="${r.image}" alt="${r.name}">
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
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    resultBox.innerHTML = `<h2 style="padding-left: 15px; color: red;">Error loading restaurants. Please try again.</h2>`;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
