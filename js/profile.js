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
  setDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Avatar URLs (external LEGO avatars)
const avatarURLs = [
  "https://randomuser.me/api/portraits/lego/0.jpg",
  "https://randomuser.me/api/portraits/lego/1.jpg",
  "https://randomuser.me/api/portraits/lego/2.jpg",
  "https://randomuser.me/api/portraits/lego/3.jpg",
  "https://randomuser.me/api/portraits/lego/4.jpg",
  "https://randomuser.me/api/portraits/lego/5.jpg",
  "https://randomuser.me/api/portraits/lego/6.jpg",
  "https://randomuser.me/api/portraits/lego/7.jpg",
  "https://randomuser.me/api/portraits/lego/8.jpg",
  "https://randomuser.me/api/portraits/lego/9.jpg"
];
let avatarIndex = 1;

// Allow clicking directly on inputs to enable editing
["first-name", "last-name", "username"].forEach((id) => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener("click", () => {
      input.disabled = false;
      input.focus();
    });
  }
});

// Show saved allergies visually
function updateAllergyDisplay(allergies) {
  const allergyDisplay = document.getElementById("allergy-display");
  if (allergyDisplay) {
    allergyDisplay.innerHTML = `<strong>Saved Preferences:</strong> ${allergies.length ? allergies.join(", ") : "None selected"}`;
  }
}

// Cycle avatar image
function cycleAvatar() {
  avatarIndex = (avatarIndex + 1) % avatarURLs.length;
  const newURL = avatarURLs[avatarIndex];
  const avatarImg = document.getElementById("avatar-img");
  avatarImg.src = newURL;
  avatarImg.setAttribute("data-avatar-url", newURL);
}
window.cycleAvatar = cycleAvatar;

document.addEventListener("DOMContentLoaded", () => {
  const allergySummary = document.getElementById("allergy-summary");

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
      console.log("🔥 Loaded profile data:", data);

      // Prefill inputs
      document.getElementById("first-name").value = data.firstName || "";
      document.getElementById("last-name").value = data.lastName || "";
 
      document.getElementById("username").value = data.username || "";
      document.getElementById("email").value = data.email || "";
      document.getElementById("email").disabled = true;

      // Allergies
      if (Array.isArray(data.allergies)) {
        data.allergies.forEach(allergy => {
          const checkbox = document.getElementById(allergy.toLowerCase());
          if (checkbox) checkbox.checked = true;
        });
        updateAllergyDisplay(data.allergies);
      } else {
        updateAllergyDisplay([]);
      }

      // Avatar
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

      // Save changes
      document.querySelector(".btn-save").addEventListener("click", async () => {
        const allergyArray = Array.from(document.querySelectorAll(".allergy-options input:checked")).map(cb => cb.id);
        const selectedAvatarURL = avatarImg.getAttribute("data-avatar-url") || avatarURLs[0];
      
        const updatedData = {
          firstName: document.getElementById("first-name").value.trim(),
          lastName: document.getElementById("last-name").value.trim(),
          username: document.getElementById("username").value.trim(),
          allergies: allergyArray,
          profilePic: selectedAvatarURL
        };
      
        try {
          await setDoc(userRef, updatedData, { merge: true });
      
          // ✅ Manually update the allergy display
          updateAllergyDisplay(allergyArray);
      
          alert("✅ Changes saved successfully.");
        } catch (err) {
          console.error("❌ Failed to update profile:", err);
          alert("Error saving profile.");
        }
      });
      
      

      // Password reset toggle (restore old UI)
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
            alert("✅ Password updated successfully.");
            document.getElementById("new-password").value = "";
            document.getElementById("confirm-password").value = "";
            document.getElementById("reset-password-section").style.display = "none";
          } catch (err) {
            console.error("❌ Password update failed:", err);
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
      console.error("❌ Error loading profile:", err);
    }
  });
});