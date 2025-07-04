import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// Firebase init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// -------- SIGNUP --------
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = document.getElementById("signup-first-name").value.trim();
    const lastName = document.getElementById("signup-last-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;

    const errorEl = document.getElementById("error-message");
    const successEl = document.getElementById("success-message");
    errorEl.textContent = "";
    successEl.textContent = "";

    if (password !== confirmPassword) {
      errorEl.textContent = "❌ Passwords do not match.";
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await sendEmailVerification(user);

      const username = firstName.toLowerCase() + Math.floor(Math.random() * 1000);
      await setDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        username,
        email,
        allergies: [],
        reviewCount: 0,
        profilePic: "avatar1"
      });

      localStorage.setItem("userUID", user.uid);
      successEl.textContent = "✅ Signup successful! Please verify your email.";
      setTimeout(() => {
        window.location.href = "profile.html";
      }, 1500);
    } catch (error) {
      console.error("Signup error:", error);
      if (error.code === "auth/email-already-in-use") {
        errorEl.textContent = "❌ This email is already in use.";
      } else if (error.code === "auth/invalid-email") {
        errorEl.textContent = "❌ Please enter a valid email.";
      } else if (error.code === "auth/weak-password") {
        errorEl.textContent = "❌ Password must be at least 6 characters.";
      } else {
        errorEl.textContent = "❌ Signup error: " + error.message;
      }
    }
  });
}

// -------- LOGIN --------
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    const errorEl = document.getElementById("error-message");
    const successEl = document.getElementById("success-message");
    errorEl.textContent = "";
    successEl.textContent = "";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await user.reload(); // Ensure emailVerified is up to date

      if (!user.emailVerified) {
        errorEl.textContent = "⚠️ Please verify your email before logging in.";
        return;
      }

      localStorage.setItem("userUID", user.uid);
      successEl.textContent = "✅ Login successful! Redirecting...";
      setTimeout(() => {
        window.location.href = "profile.html";
      }, 1200);
    } catch (error) {
      console.error("Login error:", error);
      if (error.code === "auth/wrong-password") {
        errorEl.textContent = "❌ Incorrect password. Try again.";
      } else if (error.code === "auth/user-not-found") {
        errorEl.textContent = "❌ No account found with this email.";
      } else {
        errorEl.textContent = "❌ Login error: " + error.message;
      }
    }
  });

  const forgotLink = document.getElementById("forgot-password-link");
  if (forgotLink) {
    forgotLink.addEventListener("click", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      if (!email) {
        alert("Please enter your email in the email field first.");
        return;
      }

      try {
        await sendPasswordResetEmail(auth, email);
        alert("📧 Reset email sent! Check your inbox.");
      } catch (err) {
        alert("Error sending reset email: " + err.message);
      }
    });
  }
}

// -------- GOOGLE SIGN-IN --------
const googleBtn = document.getElementById("google-signin-btn");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const nameParts = user.displayName ? user.displayName.split(" ") : ["User"];
        const firstName = nameParts[0] || "User";
        const lastName = nameParts[1] || "";

        await setDoc(userRef, {
          firstName,
          lastName,
          username: firstName.toLowerCase() + Math.floor(Math.random() * 1000),
          email: user.email,
          allergies: [],
          reviewCount: 0,
          profilePic: "avatar1"
        });
      }

      localStorage.setItem("userUID", user.uid);
      window.location.href = "profile.html";
    } catch (error) {
      console.error("Google Sign-In Error:", error.message);
      alert("❌ Google sign-in failed: " + error.message);
    }
  });
}

