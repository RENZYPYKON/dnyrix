// ========================================
// FIREBASE WEB CONFIGURATION
// Dnyrix uses:
// - Firebase Authentication
// - Cloud Firestore
//
// Firebase Storage is NOT used.
// Actual ZIP/RAR files are hosted on GitHub Releases.
// ========================================

window.firebaseConfig = {
  apiKey: "AIzaSyAt-Lh5rs9-V08S9PetTHoivnr6gf0RPgM",
  authDomain: "dnyrix-51343.firebaseapp.com",
  projectId: "dnyrix-51343",
  storageBucket: "dnyrix-51343.firebasestorage.app",
  messagingSenderId: "483525021747",
  appId: "1:483525021747:web:27159e54fa56efbc631346",
  measurementId: "G-TQ1MGM86LB"
};

// Firebase Storage is intentionally not used.
// Dnyrix stores file metadata in Firestore
// and uses GitHub Release assets as downloadable files.
