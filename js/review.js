import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const reviewsContainer = document.querySelector(".reviews");

// Load existing reviews
async function loadReviews() {
  reviewsContainer.innerHTML = `<h2>User Reviews</h2>`; // reset

  try {
    const snapshot = await getDocs(collection(db, "reviews"));
    snapshot.forEach(doc => {
      const data = doc.data();
      const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
      const allergens = (data.allergens || []).join(", ") || "N/A";
      const cuisine = data.cuisine || "N/A";
      const username = data.user?.username || "anonymous";

      const html = `
        <div class="review">
          <div class="stars">${stars}</div>
          <p class="meta-info">Allergens: ${allergens} | Cuisine: ${cuisine}</p>
          <p class="meta-info">Posted by: <strong>${username}</strong></p>
          <h3>${data.restaurant}</h3>
          <p>"${data.review}"</p>
        </div>
      `;
      reviewsContainer.insertAdjacentHTML("beforeend", html);
    });
  } catch (err) {
    console.error("Error loading reviews:", err);
    reviewsContainer.innerHTML += `<p style="color:red;">Could not load reviews.</p>`;
  }
}


// Add new review
const form = document.getElementById("reviewForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const restaurant = document.getElementById("restaurantName").value.trim();
    const reviewText = document.getElementById("reviewText").value.trim();
    const rating = parseInt(document.getElementById("ratingSelect").value);

    if (!restaurant || !reviewText || !rating) {
      alert("Please fill all fields!");
      return;
    }

    const reviewData = {
      restaurant,
      review: reviewText,
      rating,
      user: { username: "anonymous" },  // update if you have auth later
      allergens: [],
      cuisine: ""
    };

    try {
      await addDoc(collection(db, "reviews"), reviewData);
      alert("Review submitted!");
      form.reset();
      loadReviews();  // refresh list
    } catch (error) {
      console.error("Submit error:", error);
      alert("Failed to submit review.");
    }
  });
}

window.addEventListener("DOMContentLoaded", loadReviews);