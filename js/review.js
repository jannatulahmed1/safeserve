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

// Load reviews on page load
window.addEventListener("DOMContentLoaded", loadReviews);

async function loadReviews() {
  console.log("Loading reviews...");
  reviewsContainer.innerHTML = `<h2>User Reviews</h2>`; // reset

  try {
    const snapshot = await getDocs(collection(db, "reviews"));
    snapshot.forEach(doc => {
      const data = doc.data();
      const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
      const allergens = (data.allergens || []).join(", ") || "None";
      const cuisine = data.cuisine || "N/A";
      const username = data.user?.username || "anonymous";
      const restaurant = data.restaurant || "Unknown";
      const reviewText = data.review || "";

      const html = `
        <div class="review">
          <h3>${restaurant}</h3>
          <p class="meta-info">Posted by: <strong>${username}</strong></p>
          <p class="meta-info">Allergens: ${allergens} | Cuisine: ${cuisine}</p>
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