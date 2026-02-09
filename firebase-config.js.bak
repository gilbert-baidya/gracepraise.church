// Firebase Configuration
// Grace and Praise Bangladesh Church Song Book

const firebaseConfig = {
  apiKey: "AIzaSyBfgN7unrb14jNnrdvDkqAobBNkIXHGsvg",
  authDomain: "grace-and-praise-bangladesh.firebaseapp.com",
  projectId: "grace-and-praise-bangladesh",
  storageBucket: "grace-and-praise-bangladesh.firebasestorage.app",
  messagingSenderId: "442116018308",
  appId: "1:442116018308:web:7cfb041fad8b68256432d1",
  measurementId: "G-E500EPBKCF",
  databaseURL: "https://grace-and-praise-bangladesh-default-rtdb.firebaseio.com"
};

// Authorized users who can create and manage playlists
const authorizedUsers = [
  'munkarmokar@gmail.com',      // Munmun
  'gilbert.baidya@gmail.com',   // Gilbert
  'dinabiswas@gmail.com',       // Dina
  'blessdj32@gmail.com',        // Arif
  'gabrieldalim@gmail.com'      // Dalim
];

// Initialize Firebase (will be called from app.js)
let auth = null;
let database = null;
let currentUser = null;
let isAuthorized = false;
let isSigningIn = false; // Prevent multiple popup attempts

function initializeFirebase() {
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded');
    return;
  }
  
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  database = firebase.database();
  
  // Listen for authentication state changes
  auth.onAuthStateChanged((user) => {
    currentUser = user;
    isSigningIn = false; // Reset flag when auth state changes
    if (user) {
      isAuthorized = authorizedUsers.includes(user.email.toLowerCase());
      updateUIForAuth(user, isAuthorized);
    } else {
      isAuthorized = false;
      updateUIForAuth(null, false);
      // Disable copying when signed out
      if (typeof disableCopyForUnauthorizedUser === 'function') {
        disableCopyForUnauthorizedUser();
      }
    }
  });
}

// Sign in with Google
function signInWithGoogle() {
  // Prevent multiple popup attempts
  if (isSigningIn) {
    console.log('Sign in already in progress...');
    return;
  }
  
  isSigningIn = true;
  const provider = new firebase.auth.GoogleAuthProvider();
  
  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      console.log('Signed in as:', user.email);
      isSigningIn = false;
    })
    .catch((error) => {
      isSigningIn = false;
      // Only show alert for non-cancelled errors
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error('Sign in error:', error);
        alert('Sign in failed: ' + error.message);
      } else {
        console.log('Sign in cancelled by user');
      }
    });
}

// Sign out
function signOut() {
  auth.signOut()
    .then(() => {
      console.log('Signed out successfully');
    })
    .catch((error) => {
      console.error('Sign out error:', error);
    });
}

// Check if current user is authorized
function checkAuthorization() {
  if (!currentUser) {
    alert('Please sign in to create playlists');
    return false;
  }
  
  if (!isAuthorized) {
    alert('You do not have permission to create playlists. Contact church administration.');
    return false;
  }
  
  return true;
}

// Update UI based on authentication state
function updateUIForAuth(user, authorized) {
  const authButton = document.getElementById('authButton');
  const userInfo = document.getElementById('userInfo');
  const userName = document.getElementById('userName');
  const savePlaylistBtn = document.getElementById('savePlaylistBtn');
  const savedPlaylistsSection = document.getElementById('savedPlaylistsSection');
  
  if (user) {
    authButton.style.display = 'none';
    userInfo.style.display = 'flex';
    // Display user's name instead of email
    const displayName = user.displayName || user.email.split('@')[0];
    userName.textContent = displayName;
    
    if (authorized) {
      userName.style.color = '#722f37'; // Red wine color for authorized
      if (savePlaylistBtn) savePlaylistBtn.style.display = 'inline-block';
      
      // Enable copying for authorized users
      if (typeof enableCopyForAuthorizedUser === 'function') {
        enableCopyForAuthorizedUser();
      }
    } else {
      userName.style.color = '#999'; // Gray for unauthorized
      if (savePlaylistBtn) savePlaylistBtn.style.display = 'none';
    }
    
    // Load saved playlists
    loadSavedPlaylists();
    if (savedPlaylistsSection) savedPlaylistsSection.style.display = 'block';
  } else {
    authButton.style.display = 'block';
    userInfo.style.display = 'none';
    if (savePlaylistBtn) savePlaylistBtn.style.display = 'none';
    if (savedPlaylistsSection) savedPlaylistsSection.style.display = 'none';
  }
  
  // Update add to service buttons visibility
  updateAddToServiceButtons(authorized);
}

// Update visibility of add to service buttons
function updateAddToServiceButtons(show) {
  const buttons = document.querySelectorAll('.add-to-service-btn');
  buttons.forEach(btn => {
    btn.style.display = show ? 'block' : 'none';
  });
}

// Save playlist to Firebase
function savePlaylistToFirebase(playlistName, songIds) {
  if (!checkAuthorization()) return;
  
  const playlistData = {
    name: playlistName,
    songIds: songIds,
    createdBy: currentUser.email,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  const playlistRef = database.ref('playlists').push();
  playlistRef.set(playlistData)
    .then(() => {
      alert(`Playlist "${playlistName}" saved successfully!`);
      loadSavedPlaylists();
    })
    .catch((error) => {
      console.error('Error saving playlist:', error);
      alert('Failed to save playlist: ' + error.message);
    });
}

// Load saved playlists from Firebase
function loadSavedPlaylists() {
  if (!currentUser) return;
  
  const playlistsRef = database.ref('playlists');
  playlistsRef.orderByChild('createdAt').once('value', (snapshot) => {
    const playlists = [];
    snapshot.forEach((childSnapshot) => {
      playlists.unshift({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    displaySavedPlaylists(playlists);
  });
}

// Display saved playlists
function displaySavedPlaylists(playlists) {
  const grid = document.getElementById('savedPlaylistsGrid');
  if (!grid) return;
  
  if (playlists.length === 0) {
    grid.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No saved playlists yet</p>';
    return;
  }
  
  grid.innerHTML = '';
  playlists.forEach(playlist => {
    const card = document.createElement('div');
    card.className = 'saved-playlist-card';
    const date = new Date(playlist.createdAt).toLocaleDateString();
    const canDelete = isAuthorized || (currentUser && playlist.createdBy === currentUser.email);
    
    card.innerHTML = `
      <h4>${playlist.name}</h4>
      <p>${playlist.songIds.length} songs • ${date}</p>
      <small>by ${playlist.createdBy}</small>
      <div class="playlist-card-actions">
        <button onclick="loadPlaylistById('${playlist.id}')" class="btn-small">Load</button>
        ${canDelete ? `<button onclick="deletePlaylist('${playlist.id}')" class="btn-small btn-danger">Delete</button>` : ''}
      </div>
    `;
    grid.appendChild(card);
  });
}

// Load a specific playlist
function loadPlaylistById(playlistId) {
  database.ref(`playlists/${playlistId}`).once('value', (snapshot) => {
    const playlist = snapshot.val();
    if (playlist) {
      // Clear current playlist
      if (typeof servicePlaylist !== 'undefined') {
        servicePlaylist.length = 0;
      }
      
      // Load songs from database
      playlist.songIds.forEach(songId => {
        const song = songsDatabase.find(s => s.id === songId);
        if (song && typeof servicePlaylist !== 'undefined') {
          servicePlaylist.push(song);
        }
      });
      
      if (typeof updateServicePlaylistUI === 'function') {
        updateServicePlaylistUI();
      }
      if (typeof renderSongList === 'function' && typeof getFilteredSongs === 'function') {
        renderSongList(getFilteredSongs());
      }
      
      alert(`Loaded playlist: ${playlist.name}`);
    }
  });
}

// Delete a playlist
function deletePlaylist(playlistId) {
  if (!confirm('Are you sure you want to delete this playlist?')) return;
  
  database.ref(`playlists/${playlistId}`).remove()
    .then(() => {
      alert('Playlist deleted successfully');
      loadSavedPlaylists();
    })
    .catch((error) => {
      console.error('Error deleting playlist:', error);
      alert('Failed to delete playlist: ' + error.message);
    });
}

