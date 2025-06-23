// js/auth.js
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { auth } from "../firebase-config.js";

// Sign up a user
function signUp(email, password) {
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert("Signed up: " + userCredential.user.email);
    })
    .catch((error) => {
      alert(error.message);
    });
}

// Log in a user
function logIn(email, password) {
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert("Logged in: " + userCredential.user.email);
    })
    .catch((error) => {
      alert(error.message);
    });
}
