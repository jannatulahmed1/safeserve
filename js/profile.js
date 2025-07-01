// js/profile.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Load user profile
const loadUserProfile = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      console.log("🔥 Loaded user data:", data);

      if (document.getElementById("profile-name")) {
        document.getElementById("profile-name").textContent = data.name || "No name";
      }

      if (document.getElementById("profile-email")) {
        document.getElementById("profile-email").textContent = data.email || "No email";
      }

      if (document.getElementById("profile-review-count")) {
        document.getElementById("profile-review-count").textContent =
          typeof data.reviewCount === "number" ? data.reviewCount : "0";
      }

      if (Array.isArray(data.allergies) && document.getElementById("displayed-allergies")) {
        document.getElementById("displayed-allergies").textContent =
          data.allergies.length ? data.allergies.join(', ') : "None selected";
      }
    } else {
      console.warn("No user profile found for UID:", uid);
    }
  } catch (error) {
    console.error("❌ Error loading profile:", error);
  }
};

// Detect auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadUserProfile(user.uid);
  } else {
    alert("Not logged in. Redirecting to login page...");
    window.location.href = "login.html";
  }
});


