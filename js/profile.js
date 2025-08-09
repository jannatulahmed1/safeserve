import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updatePassword
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc   
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

//initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

//Profile Pic 
const avatarURLs = [
  "https://randomuser.me/api/portraits/lego/0.jpg",
  "https://randomuser.me/api/portraits/lego/1.jpg",
  "https://randomuser.me/api/portraits/lego/2.jpg",
  "https://randomuser.me/api/portraits/lego/3.jpg",
  "https://randomuser.me/api/portraits/lego/4.jpg",
  "https://randomuser.me/api/portraits/lego/5.jpg",
  "https://randomuser.me/api/portraits/lego/6.jpg",
  "https://randomuser.me/api/portraits/lego/8.jpg",
  "https://randomuser.me/api/portraits/lego/9.jpg",
  "/assets/img1.png",
  "/assets/img2.png",
  "/assets/img3.png",
  "/assets/img5.png",
  "/assets/img6.png",
  "/assets/img7.png",
  "/assets/img8.png",
  "/assets/img9.png",
  "/assets/img10.png",

];
let avatarIndex = 1;

["first-name", "last-name", "username"].forEach((id) => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener("click", () => {
      input.disabled = false;
      input.focus();
    });
  }
});

//show saved allergies, cuisines, and diets visually
function updateAllergyDisplay(allergies = [], cuisines = [], diets = []) {
  const allergyDisplay = document.getElementById("allergy-display");
  const allPrefs = [...allergies, ...cuisines, ...diets];
  allergyDisplay.innerHTML = `<strong>Saved Preferences:</strong> ${allPrefs.length ? allPrefs.join(", ") : "None selected"}`;
}

//cycle avatar image
function cycleAvatar() {
  avatarIndex = (avatarIndex + 1) % avatarURLs.length;
  const newURL = avatarURLs[avatarIndex];
  const avatarImg = document.getElementById("avatar-img");
  avatarImg.src = newURL;
  avatarImg.setAttribute("data-avatar-url", newURL);
}
window.cycleAvatar = cycleAvatar;

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("You are not logged in. Redirecting to login page...");
      window.location.href = "login.html";
      return;
    }

    if (!user.emailVerified) {
      alert("Please verify your email before accessing your profile.");
      signOut(auth).then(() => {
        window.location.href = "login.html";
      });
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        console.warn("No user document found for UID:", user.uid);
        return;
      }

      const data = snap.data();
      console.log("Loaded profile data:", data);

      loadUserReviews(user.uid);

      //prefill inputs
      document.getElementById("first-name").value = data.firstName || "";
      document.getElementById("last-name").value = data.lastName || "";
      document.getElementById("username").value = data.username || "";
      document.getElementById("email").value = data.email || "";
      document.getElementById("email").disabled = true;

      //allergies
      if (Array.isArray(data.allergies)) {
        data.allergies.forEach(allergy => {
          const checkbox = document.getElementById(allergy.toLowerCase());
          if (checkbox) checkbox.checked = true;
        });
      }

      //cuisines
      if (Array.isArray(data.cuisines)) {
        data.cuisines.forEach(cuisine => {
          const checkbox = document.getElementById(cuisine.toLowerCase());
          if (checkbox) checkbox.checked = true;
        });
      }

      //diets
      if (Array.isArray(data.diets)) {
        data.diets.forEach(diet => {
          const checkbox = document.getElementById(diet.toLowerCase());
          if (checkbox) checkbox.checked = true;
        });
      }

      updateAllergyDisplay(data.allergies || [], data.cuisines || [], data.diets || []);
const prefsToStore = {
  allergies: data.allergies || [],
  cuisines: data.cuisines || [],
  diets: data.diets || []
};
localStorage.setItem("safeserveUserPrefs", JSON.stringify(prefsToStore));
console.log("📦 Preferences stored in localStorage on load.");

      window.toggleDropdown = function (id, headerEl) {
        const dropdown = document.getElementById(id);
        dropdown.classList.toggle("open");
        headerEl.classList.toggle("open");
      };
      

      //avatar
      const avatarImg = document.getElementById("avatar-img");
      if (data.profilePic && avatarURLs.includes(data.profilePic)) {
        avatarImg.src = data.profilePic;
        avatarImg.setAttribute("data-avatar-url", data.profilePic);
        avatarIndex = avatarURLs.indexOf(data.profilePic);
      } else {
        avatarImg.src = avatarURLs[0];
        avatarImg.setAttribute("data-avatar-url", avatarURLs[0]);
        avatarIndex = 0;
      }

      //save changes
      document.querySelector(".btn-save").addEventListener("click", async () => {
        const allergyArray = Array.from(document.querySelectorAll("#allergenDropdown input:checked")).map(cb => cb.id);
        const cuisineArray = Array.from(document.querySelectorAll("#cuisineDropdown input:checked")).map(cb => cb.id);
        const dietArray = Array.from(document.querySelectorAll("#dietDropdown input:checked")).map(cb => cb.id);
        const selectedAvatarURL = avatarImg.getAttribute("data-avatar-url") || avatarURLs[0];

        const updatedData = {
          firstName: document.getElementById("first-name").value.trim(),
          lastName: document.getElementById("last-name").value.trim(),
          username: document.getElementById("username").value.trim(),
          allergies: allergyArray,
          cuisines: cuisineArray,
          diets: dietArray,
          profilePic: selectedAvatarURL
        };

        try {
          await setDoc(userRef, updatedData, { merge: true });
          updateAllergyDisplay(allergyArray, cuisineArray, dietArray);
          
          //Save preferences to localStorage
          const prefsToStore = {
            allergies: allergyArray,
            cuisines: cuisineArray,
            diets: dietArray
          };
          localStorage.setItem("safeserveUserPrefs", JSON.stringify(prefsToStore));
          console.log("Preferences saved to localStorage for restaurant filter");
          
          alert("Changes saved successfully.");
          
        } catch (err) {
          console.error("Failed to update profile:", err);
          alert("Error saving profile.");
        }
      });

      // Password reset toggle
      const resetBtn = document.getElementById("reset-password-toggle");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          const resetSection = document.getElementById("reset-password-section");
          if (resetSection) {
            resetSection.style.display = resetSection.style.display === "none" ? "block" : "none";
          }
        });
      }

      const confirmResetBtn = document.getElementById("confirm-reset-btn");
      if (confirmResetBtn) {
        confirmResetBtn.addEventListener("click", async () => {
          const newPass = document.getElementById("new-password").value;
          const confirmPass = document.getElementById("confirm-password").value;

          if (!newPass || !confirmPass) {
            alert("Please fill in both password fields.");
            return;
          }

          if (newPass !== confirmPass) {
            alert("Passwords do not match.");
            return;
          }

          try {
            await updatePassword(user, newPass);
            alert("Password updated successfully.");
            document.getElementById("new-password").value = "";
            document.getElementById("confirm-password").value = "";
            document.getElementById("reset-password-section").style.display = "none";
          } catch (err) {
            console.error("Password update failed:", err);
            alert("Failed to update password: " + err.message);
          }
        });
      }

      // Logout
      document.querySelector(".btn-danger").addEventListener("click", () => {
        signOut(auth).then(() => {
          window.location.href = "index.html";
        });
      });

    } catch (err) {
      console.error("Error loading profile:", err);
    }
  });
});
//changes 
async function loadUserReviews(userId) {
  const container = document.getElementById("user-reviews-container");
  container.innerHTML = "";

  try {
    const snapshot = await getDocs(collection(db, "reviews"));
    const userReviews = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.userId === userId) {
        data.id = docSnap.id;
        userReviews.push(data);
      }
    });

    if (userReviews.length === 0) {
      container.innerHTML = "<p>You haven’t left any reviews yet.</p>";
      return;
    }

    userReviews.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);

    userReviews.forEach(data => {
      const stars = "★".repeat(data.rating || 0) + "☆".repeat(5 - (data.rating || 0));
      const avatar = document.getElementById("avatar-img")?.src || "https://randomuser.me/api/portraits/lego/1.jpg";
      const username = document.getElementById("username")?.value || "Anonymous";

      const html = `
        <div class="review" style="background:#fff; padding:15px 20px; border-radius:12px; margin-bottom:20px; box-shadow:0 2px 5px rgba(0,0,0,0.05);" data-id="${data.id}">
          <h3 style="color:#4C6444;">${data.restaurant || "Unknown Restaurant"}</h3>
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <img src="${avatar}" alt="avatar" style="width: 40px; height: 40px; border-radius: 50%;" />
            <span style="font-weight:bold;">${username}</span>
            <button onclick="deletePastReview('${data.id}')" style="margin-left:auto; background:#800000; color:white; border:none; padding:5px 10px; border-radius:4px;">Delete</button>
          </div>
          <p class="meta-info" style="font-size:14px; color:#555;">
            Allergens: ${data.allergens?.join(", ") || "None"} | 
            Cuisine: ${data.cuisine || "N/A"} | 
            Diet: ${data.diets?.join(", ") || "None"}
          </p>
          <div class="stars" style="color:gold; font-size:18px;">${stars}</div>
          <p style="margin-top:8px;">"${data.review || ""}"</p>
        </div>
      `;
      container.insertAdjacentHTML("beforeend", html);
    });

  } catch (err) {
    console.error("Error loading past reviews:", err);
    container.innerHTML = `<p style="color:red;">Failed to load your reviews.</p>`;
  }
}
window.deletePastReview = async function (reviewId) {
  if (!confirm("Are you sure you want to delete this review?")) return;

  try {
    await deleteDoc(doc(db, "reviews", reviewId));
    alert("Review deleted!");
    loadUserReviews(auth.currentUser.uid); // reload updated list
  } catch (err) {
    console.error("Error deleting review:", err);
    alert("Failed to delete review.");
  }
};

window.switchTab = function (tab) {
  document.getElementById('edit-tab').classList.remove('active');
  document.getElementById('reviews-tab').classList.remove('active');
  document.getElementById('edit-section').style.display = 'none';
  document.getElementById('reviews-section').style.display = 'none';

  if (tab === 'edit') {
    document.getElementById('edit-tab').classList.add('active');
    document.getElementById('edit-section').style.display = 'block';
  } else {
    document.getElementById('reviews-tab').classList.add('active');
    document.getElementById('reviews-section').style.display = 'block';
  }
};
