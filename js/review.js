import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
  getDocs,
  deleteDoc,
  query
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const form = document.getElementById("reviewForm");
const formSection = document.querySelector(".form-container");
const reviewsContainer = document.querySelector(".reviews");
const loginPrompt = document.getElementById("loginPromptContainer");

let currentUserId = null;

onAuthStateChanged(auth, (user) => {
  currentUserId = user && user.emailVerified ? user.uid : null;

  if (!user || !user.emailVerified) {
    if (formSection) formSection.style.display = "none";
    if (loginPrompt) loginPrompt.style.display = "block";
  } else {
    if (formSection) formSection.style.display = "block";
    if (loginPrompt) loginPrompt.style.display = "none";
  }

  loadReviews();
});

const allergyList = ["peanut", "tree nut", "nut", "milk", "egg", "wheat", "gluten", "soy", "fish", "shellfish", "sesame", "mustard", "sulfite", "corn", "dairy", "celery", "yeast", "lupin", "mollusk", "buckwheat", "latex", "other"];
const cuisineList = [
  "italian", "chinese", "indian", "mexican", "thai", "japanese", "american",
  "mediterranean", "korean",  "greek", "french", "caribbean",
  "vietnamese", "ethiopian", "turkish", "cuban", "bengali", "dominican",
  "puerto rican", "jamaican", "peruvian", "filipino", "lebanese", "brazilian",
  "nigerian", "ghanaian", "moroccan", "egyptian", "somali", "other"
 ];const dietList = ["vegan","vegetarian","pescatarian","halal","kosher","low-carb","low-sodium", "other"];

window.addEventListener("DOMContentLoaded", () => {
  populateFilters();

  document.getElementById("applyFiltersBtn")?.addEventListener("click", () => {
    const selectedAllergies = getCheckedValues("allergy");
    const selectedCuisines = getCheckedValues("cuisine");
    const selectedDiets = getCheckedValues("diet");
    loadReviews(selectedAllergies, selectedCuisines, selectedDiets);
  });

  document.getElementById("useSavedPrefsBtn")?.addEventListener("click", () => {
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

    loadReviews([...allergySet], [...cuisineSet], [...dietSet]);
  });
});

function populateFilters() {
  const allergenDiv = document.getElementById("allergenFilters");
  const cuisineDiv = document.getElementById("cuisineFilters");
  const dietDiv = document.getElementById("dietFilters");

  allergyList.forEach(option => allergenDiv?.appendChild(createCheckbox("allergy", option)));
  cuisineList.forEach(option => cuisineDiv?.appendChild(createCheckbox("cuisine", option)));
  dietList.forEach(option => dietDiv?.appendChild(createCheckbox("diet", option)));
}

function createCheckbox(name, value) {
  const label = document.createElement("label");
  label.style.cssText = "display:inline-flex; align-items:center; margin:5px 10px 5px 0; font-size:14px;";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.name = name;
  checkbox.value = value;
  checkbox.style.marginRight = "6px";
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(capitalize(value)));
  return label;
}

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
    .map(cb => cb.value.toLowerCase());
}

async function loadReviews(filterAllergies = [], filterCuisines = [], filterDiets = []) {
  reviewsContainer.innerHTML = `<h2>User Reviews</h2>`;
  try {
    const snapshot = await getDocs(query(collection(db, "reviews")));
    const reviews = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      data.id = docSnap.id;
      data.timestamp = data.timestamp || 0;
      reviews.push(data);
    });

    reviews.sort((a, b) => b.timestamp - a.timestamp);

    for (let data of reviews) {
      const { userId } = data;
      const allergens = (data.allergens || []).map(a => a.toLowerCase());
      const cuisine = (data.cuisine || "").toLowerCase();
      const diets = (data.diets || []).map(d => d.toLowerCase());

      const matchAllergy = filterAllergies.every(a => allergens.includes(a));
      const matchDiet = filterDiets.every(d => diets.includes(d));
      const matchCuisine = filterCuisines.length === 0 || filterCuisines.includes(cuisine);
      
      if (!(matchAllergy && matchCuisine && matchDiet)) continue;

      let username = "Anonymous";
      let profilePic = "avatar1";
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          username = userData.username || userData.firstName || "Anonymous";
          profilePic = userData.profilePic || "avatar1";
        }
      } catch (err) {
        console.warn("Could not fetch user profile:", err);
      }

      const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
      const restaurant = data.restaurant || "Unknown";
      const reviewText = data.review || "";
      const isOwner = currentUserId && currentUserId === userId;

      const html = `
        <div class="review" data-id="${data.id}">
          <h3>${restaurant}</h3>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="https://randomuser.me/api/portraits/lego/${getAvatarNumber(profilePic)}.jpg" alt="avatar" style="width: 40px; height: 40px; border-radius: 50%;" />
            <p class="meta-info">Posted by: <strong>${username}</strong></p>
            ${isOwner ? `<button onclick="deleteReview('${data.id}')" style="margin-left:auto; background:#800000; color:white; border:none; padding:5px 10px; border-radius:4px;">Delete</button>` : ""}
          </div>
          <p class="meta-info">Allergens: ${data.allergens?.join(", ") || "None"} | Cuisine: ${data.cuisine || "N/A"} | Diet: ${data.diets?.join(", ") || "None"}</p>
          <div class="stars">${stars}</div>
          <p>"${reviewText}"</p>
        </div>
      `;
      reviewsContainer.insertAdjacentHTML("beforeend", html);
    }
  } catch (err) {
    console.error("Error loading reviews:", err);
    reviewsContainer.innerHTML += `<p style="color:red;">Could not load reviews.</p>`;
  }
}

window.deleteReview = async function (id) {
  if (confirm("Are you sure you want to delete this review?")) {
    try {
      await deleteDoc(doc(db, "reviews", id));
      loadReviews();
    } catch (err) {
      console.error("Error deleting review:", err);
      alert("Failed to delete review.");
    }
  }
};
window.deleteReview = async function (id) {
  if (confirm("Are you sure you want to delete this review?")) {
    try {
      await deleteDoc(doc(db, "reviews", id));
      loadReviews();
    } catch (err) {
      console.error("Error deleting review:", err);
      alert("Failed to delete review.");
    }
  }
};

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    alert("You must be logged in and have a verified email to submit a review.");
    return;
  }

  const restaurant = document.getElementById("restaurantName").value.trim();
  const reviewText = document.getElementById("reviewText").value.trim();
  const rating = parseInt(document.getElementById("ratingSelect").value);
  const allergens = Array.from(document.querySelectorAll('#allergenOptions input[type="checkbox"]:checked')).map(cb => cb.value);
  const cuisine = document.getElementById("cuisineSelect").value;
  const diets = Array.from(document.querySelectorAll('input[name="diet"]:checked')).map(cb => cb.value);

  if (!restaurant || !reviewText || !rating) {
    alert("Please fill all fields!");
    return;
  }

  const reviewData = {
    restaurant,
    review: reviewText,
    rating,
    userId: user.uid,
    allergens,
    cuisine,
    diets,
    timestamp: Date.now()
  };

  try {
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
function getAvatarNumber(profilePic) {
  const match = profilePic.match(/\d+/);
  return match ? match[0] : "1";
}