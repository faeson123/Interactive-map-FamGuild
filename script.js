import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  remove,
  set
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

window.addEventListener('DOMContentLoaded', () => {
  const firebaseConfig = {
    apiKey: "AIzaSyDHW-dBKqMEJ2ym1sMmjao03iK7JQLiB94",
    authDomain: "map-data-base-620d3.firebaseapp.com",
    databaseURL: "https://map-data-base-620d3-default-rtdb.firebaseio.com",
    projectId: "map-data-base-620d3",
    storageBucket: "map-data-base-620d3.appspot.com",
    messagingSenderId: "765561070786",
    appId: "1:765561070786:web:f4e1e44c9284ea6ff8075b",
    measurementId: "G-4NTXWDK5G0"
  };

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const markerRef = ref(db, "markers");
  let lastDeleted = null;

  const markerIcons = {
    fish: '❌',
    mining: '⛏️',
    herb: '🌿',
    quest: '❗',
    dynamic: '⚔️'
  };

  const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 2,
  });

  const cols = 26;
  const rows = 26;
  const cellSize = 30;
  const width = cols * cellSize;
  const height = rows * cellSize;
  const bounds = [[0, 0], [height, width]];

  L.imageOverlay("map-bg.png", bounds).addTo(map);
  map.setMaxBounds(bounds);
  map.fitBounds(bounds);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const y = row * cellSize + 5;
      const x = col * cellSize + 5;
      const label = String.fromCharCode(65 + col) + (row + 1);
      const divIcon = L.divIcon({ className: 'grid-label', html: label, iconSize: [0, 0] });
      L.marker([y, x], { icon: divIcon, interactive: false }).addTo(map);
    }
  }

  for (let i = 0; i <= cols; i++) {
    const x = i * cellSize;
    L.polyline([[0, x], [height, x]], { color: 'black', weight: 1 }).addTo(map);
  }
  for (let j = 0; j <= rows; j++) {
    const y = j * cellSize;
    L.polyline([[y, 0], [y, width]], { color: 'black', weight: 1 }).addTo(map);
  }

  for (let i = 0; i < cols; i++) {
    const label = String.fromCharCode(65 + i);
    const x = i * cellSize + cellSize / 2;
    L.marker([0, x], { icon: L.divIcon({ className: 'grid-border', html: label }), interactive: false }).addTo(map);
    L.marker([height, x], { icon: L.divIcon({ className: 'grid-border', html: label }), interactive: false }).addTo(map);
  }
  for (let j = 0; j < rows; j++) {
    const y = j * cellSize + cellSize / 2;
    L.marker([y, 0], { icon: L.divIcon({ className: 'grid-border', html: j + 1 }), interactive: false }).addTo(map);
    L.marker([y, width], { icon: L.divIcon({ className: 'grid-border', html: j + 1 }), interactive: false }).addTo(map);
  }

  const typeLayers = {
    fish: L.layerGroup().addTo(map),
    mining: L.layerGroup().addTo(map),
    herb: L.layerGroup().addTo(map),
    quest: L.layerGroup().addTo(map),
    dynamic: L.layerGroup().addTo(map)
  };

  document.getElementById('toggleMarkers')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    Object.values(typeLayers).forEach(layer => checked ? map.addLayer(layer) : map.removeLayer(layer));
  });

  document.querySelectorAll('.type-toggle').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const type = e.target.getAttribute('data-type');
      if (e.target.checked) {
        map.addLayer(typeLayers[type]);
      } else {
        map.removeLayer(typeLayers[type]);
      }
    });
  });

  function checkPassword() {
    const stored = sessionStorage.getItem('adminPassword');
    if (stored === 'Pumpitup') return true;
    const input = prompt("Enter admin password:");
    if (input === 'Pumpitup') {
      sessionStorage.setItem('adminPassword', 'Pumpitup');
      return true;
    }
    alert("Incorrect password.");
    return false;
  }

  function createMarker(data, key) {
    const icon = L.divIcon({ html: markerIcons[data.type] });
    const marker = L.marker([data.lat, data.lng], { icon });
    marker.bindPopup(`<b>${data.type.toUpperCase()}</b><br>${data.name || ''}<br><button onclick="window.deleteMarker('${key}', ${JSON.stringify(data).replace(/"/g, '&quot;')})">Delete</button>`);
    typeLayers[data.type].addLayer(marker);
  }

  window.deleteMarker = function (key, data) {
    if (!checkPassword()) return;
    if (confirm('Delete marker?')) {
      lastDeleted = { key, data };
      remove(ref(db, 'markers/' + key))
        .then(() => console.log("🗑 Marker deleted"))
        .catch(err => console.error("❌ Delete failed:", err));
    }
  }

  onChildAdded(markerRef, snapshot => {
    const data = snapshot.val();
    createMarker(data, snapshot.key);
  });

  map.on('click', function (e) {
    if (!checkPassword()) return;
    const type = prompt("Enter marker type: fish, mining, herb, quest, dynamic");
    if (!markerIcons[type]) return alert("Invalid type.");
    let name = "";
    if (type !== 'fish') {
      name = prompt("Enter custom name for this marker:") || "";
    }
    console.log('📤 Sending marker:', { lat: e.latlng.lat, lng: e.latlng.lng, type, name, authKey: 'Pumpitup' });
    push(markerRef, {
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      type,
      name,
      authKey: 'Pumpitup'
    }).then(() => {
      console.log("✅ Marker saved");
    }).catch(err => {
      console.error("❌ Save failed:", err);
    });
  });

  document.getElementById("undoBtn")?.addEventListener("click", () => {
    if (lastDeleted) {
      console.log('↩️ Restoring marker:', { ...lastDeleted.data, authKey: 'Pumpitup' });
      set(ref(db, 'markers/' + lastDeleted.key), { ...lastDeleted.data, authKey: 'Pumpitup' })
        .then(() => console.log("↩️ Marker restored"))
        .catch(err => console.error("❌ Restore failed:", err));
      lastDeleted = null;
    } else {
      alert("Nothing to undo.");
    }
  });
});
