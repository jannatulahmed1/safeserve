// js/restaurants.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Wait for DOM to load before accessing elements
window.addEventListener("DOMContentLoaded", () => {
  const applyBtn = document.getElementById("applyFiltersBtn");

  // Fetch all restaurants on page load
  fetchRestaurants();

  // Handle filter button click
  applyBtn.addEventListener("click", () => {
    const selected = Array.from(
      document.querySelectorAll('input[name="allergy"]:checked')
    ).map(cb => cb.value.toLowerCase());

    fetchRestaurants(selected);
  });
});

async function fetchRestaurants(allergies = []) {
  const resultBox = document.querySelector(".resultbox");
  resultBox.innerHTML = `<h2 style="padding-left: 15px;">Loading...</h2>`;

  try {
    const snapshot = await getDocs(collection(db, "restaurants"));
    const restaurants = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const safeAllergies = (data.safeFor || []).map(a => a.trim().toLowerCase());

      const matches = allergies.every(a => safeAllergies.includes(a));
      if (allergies.length === 0 || matches) {
        restaurants.push(data);
      }
    });

    if (restaurants.length === 0) {
      resultBox.innerHTML = `<h2 style="padding-left: 15px;">No matching restaurants found.</h2>`;
      return;
    }

    resultBox.innerHTML = ""; // Clear the loading text

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
