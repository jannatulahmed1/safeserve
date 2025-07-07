import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById("reviewForm");
const reviewsContainer = document.querySelector(".reviews");

const allergyList = [
  "peanut", "almond", "milk", "egg", "salmon", "tuna", "walnut",
  "cashew", "pistachio", "hazelnut", "shrimp", "wheat", "gluten",
  "crab", "lobster", "oats", "corn", "sesame", "soy",
  "avocado", "chickpeas", "banana"
];

const cuisineList = [
  "italian", "chinese", "indian", "mexican", "thai",
  "japanese", "american", "mediterranean", "korean",
  "middle-eastern", "greek", "french", "caribbean",
  "vietnamese", "ethiopian"
];

const dietList = [
  "vegan", "vegetarian", "pescatarian", "halal",
  "kosher", "low-carb", "low-sodium"
];

window.addEventListener("DOMContentLoaded", () => {
  populateFilters();
  loadReviews();

  document.getElementById("applyFiltersBtn")?.addEventListener("click", () => {
    const selectedAllergies = getCheckedValues("allergy");
    const selectedCuisines = getCheckedValues("cuisine");
    const selectedDiets = getCheckedValues("diet");
    loadReviews(selectedAllergies, selectedCuisines, selectedDiets);
  });

  document.getElementById("useSavedPrefsBtn")?.addEventListener("click", () => {
    const saved = JSON.parse(localStorage.getItem("savedAllergies") || "[]");
    const savedSet = new Set(saved.map(a => a.toLowerCase()));
    document.querySelectorAll('input[name="allergy"]').forEach(cb => {
      cb.checked = savedSet.has(cb.value.toLowerCase());
    });
  });
});

function populateFilters() {
  const allergenDiv = document.getElementById("allergenFilters");
  const cuisineDiv = document.getElementById("cuisineFilters");
  const dietDiv = document.getElementById("dietFilters");

  allergyList.forEach(option => {
    allergenDiv?.appendChild(createCheckbox("allergy", option));
  });

  cuisineList.forEach(option => {
    cuisineDiv?.appendChild(createCheckbox("cuisine", option));
  });

  dietList.forEach(option => {
    dietDiv?.appendChild(createCheckbox("diet", option));
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

async function loadReviews(filterAllergies = [], filterCuisines = [], filterDiets = []) {
  reviewsContainer.innerHTML = `<h2>User Reviews</h2>`;
  try {
    const snapshot = await getDocs(collection(db, "reviews"));
    snapshot.forEach(doc => {
      const data = doc.data();
      const allergens = (data.allergens || []).map(a => a.toLowerCase());
      const cuisine = (data.cuisine || "").toLowerCase();
      const tags = (data.allergens || []).map(t => t.toLowerCase());

      const matchAllergy = filterAllergies.length === 0 || filterAllergies.every(a => allergens.includes(a));
      const matchCuisine = filterCuisines.length === 0 || filterCuisines.includes(cuisine);
      const matchDiet = filterDiets.length === 0 || filterDiets.some(d => tags.includes(d));

      if (!matchAllergy || !matchCuisine || !matchDiet) return;

      const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
      const username = data.user?.username || "anonymous";
      const restaurant = data.restaurant || "Unknown";
      const reviewText = data.review || "";

      const html = `
        <div class="review">
          <h3>${restaurant}</h3>
          <p class="meta-info">Posted by: <strong>${username}</strong></p>
          <p class="meta-info">Allergens: ${data.allergens?.join(", ") || "None"} | Cuisine: ${data.cuisine || "N/A"}</p>
          <div class="stars">${stars}</div>
          <p>"${reviewText}"</p>
        </div>
      `;
      reviewsContainer.insertAdjacentHTML("beforeend", html);
    });
  } catch (err) {
    console.error("Error loading reviews:", err);
    reviewsContainer.innerHTML += `<p style="color:red;">Could not load reviews.</p>`;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const restaurant = document.getElementById("restaurantName").value.trim();
  const reviewText = document.getElementById("reviewText").value.trim();
  const rating = parseInt(document.getElementById("ratingSelect").value);

  const allergenChecks = document.querySelectorAll('#allergenOptions input[type="checkbox"]');
  const allergens = Array.from(allergenChecks).filter(cb => cb.checked).map(cb => cb.value);

  const cuisine = document.getElementById("cuisineSelect").value;

  const uid = localStorage.getItem("userUID");
  let username = "anonymous";

  if (uid) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        username = userData.username || userData.firstName || "anonymous";
      }
    } catch (err) {
      console.error("Could not fetch username:", err);
    }
  }

  if (!restaurant || !reviewText || !rating) {
    alert("Please fill all fields!");
    return;
  }

  const reviewData = {
    restaurant,
    review: reviewText,
    rating,
    user: { username },
    allergens,
    cuisine
  };

  try {
    console.log("Submitting review:", reviewData);
    await addDoc(collection(db, "reviews"), reviewData);
    alert("Review submitted!");
    form.reset();
    loadReviews();
  } catch (error) {
    console.error("Submit error:", error);
    alert("Failed to submit review.");
  }
});

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}