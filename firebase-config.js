// Firebase Configuration
// Import this file in index.html and login.html before main scripts

const firebaseConfig = {
    apiKey: "REMOVED_SECRET",
    authDomain: "hardini-3e576.firebaseapp.com",
    databaseURL: "https://hardini-3e576-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hardini-3e576",
    storageBucket: "hardini-3e576.firebasestorage.app",
    messagingSenderId: "971878226528",
    appId: "1:971878226528:web:2d9a2510818c6b55eb0105",
    measurementId: "G-1N63FQGHNV"
};

// Export for module usage if needed, or just global variable for vanilla JS
if (typeof module !== 'undefined') {
    module.exports = firebaseConfig;
}
