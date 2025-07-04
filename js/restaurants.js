// js/restaurants.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function loadRestaurants() {
  const restaurantRef = collection(db, "restaurants");
  const snapshot = await getDocs(restaurantRef);

  const resultBox = document.querySelector(".resultbox");
  resultBox.innerHTML = '<h2 style="padding-left: 15px;">Results for Selected Allergens: No Allergens Selected</h2>';

  snapshot.forEach(doc => {
    const data = doc.data();
    const card = document.createElement("div");
    card.className = "restaurant-card";
    card.innerHTML = `
      <img src="${data.image || ''}" alt="${data.name}" />
      <div class="restaurant-info">
        <h3>${data.name}</h3>
        <p><strong>Location:</strong> ${data.location}</p>
        <p><strong>Cuisine:</strong> ${data.cuisine}</p>
        <p><strong>Safe for:</strong> ${data.safeFor?.join(", ") || "None"}</p>
        <p class="rating">Rating: ⭐ ${data.rating}</p>
        <a href="${data.link}" target="_blank" class="view-button">View Restaurant</a>
        </div>
    `;
    resultBox.appendChild(card);
  });
}

window.addEventListener("DOMContentLoaded", loadRestaurants);
