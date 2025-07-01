import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// SIGN UP
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
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

      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        allergies: [],
        reviewCount: 0
      });

      localStorage.setItem("userUID", user.uid); // Save for profile page
      successEl.textContent = "✅ Signup successful! Redirecting...";
      setTimeout(() => {
        window.location.href = "profile.html";
      }, 1200);
    } catch (error) {
      errorEl.textContent = "❌ Signup error: " + error.message;
    }
  });
}

// LOGIN
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    const errorEl = document.getElementById("error-message");
    const successEl = document.getElementById("success-message");

    errorEl.textContent = "";
    successEl.textContent = "";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      localStorage.setItem("userUID", user.uid);
      successEl.textContent = "✅ Login successful! Redirecting...";
      setTimeout(() => {
        window.location.href = "profile.html";
      }, 1200);
    } catch (error) {
      errorEl.textContent = "❌ Login error: " + error.message;
    }
  });
}

