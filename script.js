const state = {
  query: "",
  filter: "All",
  files: []
};

const fileGrid = document.getElementById("fileGrid");
const countEl = document.getElementById("fileCount");
const heroCount = document.getElementById("heroCount");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const adminAccessButton = document.querySelector(".admin-access");

function isFirebaseConfigured() {
  return !!window.firebaseConfig && !window.firebaseConfig.apiKey.includes("YOUR_");
}

function updateFileCount() {
  const totalFiles = state.files.length;
  const label = totalFiles === 1 ? "File Available" : "Files Available";
  countEl.textContent = `${totalFiles} ${label}`;
  heroCount.textContent = `${totalFiles} Files`;
}

function formatTimeStamp(timestamp) {
  if (!timestamp) return "Recently";
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function getVisibleFiles() {
  const searchTerm = state.query.trim().toLowerCase();

  return state.files.filter((file) => {
    const fileType = (file.type || "").toUpperCase();
    const typeMatch = state.filter === "All" || fileType === state.filter;
    const searchMatch =
      !searchTerm ||
      [file.name, file.originalName, file.description, file.version, fileType]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm);

    return typeMatch && searchMatch;
  });
}

function renderNoFirebaseState() {
  fileGrid.innerHTML = `
    <div class="empty-state" aria-live="polite">
      <h3>Firebase setup required</h3>
      <p>Add your Firebase web configuration in firebase/firebase-config.js to enable published downloads.</p>
    </div>
  `;
  countEl.textContent = "0 Files Available";
  heroCount.textContent = "0 Files";
}

function normalizeStatus(status) {
  if (!status) return "Updated";
  const clean = String(status).trim();
  if (clean.toLowerCase() === "under maintenance" || clean.toLowerCase() === "maintenance") return "Maintenance";
  if (clean.toLowerCase() === "soon") return "Soon";
  if (clean.toLowerCase() === "expired") return "Expired";
  return "Updated";
}

function renderFiles() {
  const visibleFiles = getVisibleFiles();

  const safeFiles = visibleFiles.map((file) => ({
    ...file,
    name: file.name || "Unnamed File",
    type: (file.type || "").toUpperCase() || "FILE",
    status: normalizeStatus(file.status),
    sizeFormatted: file.sizeFormatted || file.size || "Unknown size",
    version: file.version || "",
    description: file.description || "",
    downloadURL: file.downloadURL || "#"
  }));

  if (!state.files.length) {
    fileGrid.innerHTML = `
      <div class="empty-state" aria-live="polite">
        <h3>No downloads available</h3>
        <p>Files will appear here when they are added.</p>
      </div>
    `;
    updateFileCount();
    return;
  }

  if (visibleFiles.length === 0) {
    fileGrid.innerHTML = `
      <div class="empty-state" aria-live="polite">
        <h3>No files found</h3>
        <p>Try searching for another file name or type.</p>
      </div>
    `;
    return;
  }

  fileGrid.innerHTML = safeFiles
    .map((file) => {
      const fileType = file.type || "FILE";
      const iconMarkup =
        fileType === "ZIP"
          ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2h4v3h3v3h-3v3h-4V8H7V5h3V2Zm-2 9h8v9H8v-9Zm2 2v2h4v-2h-4Zm1 3h2v2h-2v-2Z"/></svg>`
          : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 1.5V8h3.5L14 4.5Zm-6 6.5h10v2H8v-2Zm0 4h10v2H8v-2Z"/></svg>`;

      const statusLabel = file.status || "Updated";
      const statusClass = statusLabel.toLowerCase().replace(/\s+/g, "-");

      return `
        <article class="file-card" aria-label="${file.name} ${fileType} archive">
          <div class="file-header">
            <div class="file-icon" aria-hidden="true">${iconMarkup}</div>
            <div class="file-badges">
              <span class="file-badge">${fileType}</span>
              <span class="status-badge status-${statusClass}">${statusLabel}</span>
            </div>
          </div>

          <h3>${file.name}</h3>

          <div class="file-meta">
            <span>${fileType}</span>
            <span>•</span>
            <span>${file.sizeFormatted || file.size}</span>
          </div>

          <div class="file-details">
            ${file.version ? `<span>${file.version}</span>` : ""}
            ${file.uploadedAt ? `<span>${formatTimeStamp(file.uploadedAt)}</span>` : ""}
          </div>

          ${file.description ? `
            <div class="description-wrap">
              <p class="file-description">${file.description}</p>
              <button type="button" class="description-toggle" aria-expanded="false">See more</button>
            </div>
          ` : ""}

          <a class="download-btn" href="${file.downloadURL || '#'}" target="_blank" rel="noopener" download aria-label="Download ${file.name}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.6l3.6-3.6 1.4 1.4-5.9 5.9-5.9-5.9 1.4-1.4L11 13.6V3h1Zm-8 16h16v2H4v-2Z"/></svg>
            <span>Download</span>
          </a>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".description-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const container = button.closest(".description-wrap");
      const description = container?.querySelector(".file-description");
      if (!container || !description) return;

      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      description.classList.toggle("expanded", !expanded);
      button.textContent = expanded ? "See more" : "Show less";
    });
  });

  document.querySelectorAll(".download-btn").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.remove("pressed");
      void button.offsetWidth;
      button.classList.add("pressed");
      window.setTimeout(() => button.classList.remove("pressed"), 180);
    });
  });
}

function loadPublicFiles() {
  if (!window.firebase || !window.firebase.firestore) {
    renderNoFirebaseState();
    return;
  }

  if (!isFirebaseConfigured()) {
    renderNoFirebaseState();
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  const db = firebase.firestore();
  db.collection("files")
    .where("published", "==", true)
    .orderBy("uploadedAt", "desc")
    .get()
    .then((snapshot) => {
      state.files = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((file) => file.published === true)
        .map((file) => ({
          ...file,
          name: file.name || "Unnamed File",
          type: (file.type || "").toUpperCase(),
          status: normalizeStatus(file.status),
          sizeFormatted: file.sizeFormatted || file.size || "Unknown size",
          downloadURL: file.downloadURL || "#"
        }));

      updateFileCount();
      renderFiles();
    })
    .catch((error) => {
      const errorDetails = {
        code: error && error.code,
        message: error && error.message,
        name: error && error.name,
        error
      };
      const errorMessage = String((error && error.message) || "");
      const indexUrl = errorMessage.match(/https:\/\/console\.firebase\.google\.com\/[^\s]+/i)?.[0];

      console.error("Public Firestore query failed:", errorDetails);

      if (error && error.code === "permission-denied") {
        console.error("Public Firestore read was denied by Firestore Rules or authorization.", errorDetails);
      } else if (
        error && error.code === "failed-precondition" &&
        /index/i.test(errorMessage)
      ) {
        console.error("Public Firestore query requires a composite index.", errorDetails);
        if (indexUrl) {
          console.error("Create the required Firestore index:", indexUrl);
        }
      }

      fileGrid.innerHTML = `
        <div class="empty-state" aria-live="polite">
          <h3>Files could not be loaded</h3>
          <p>Please confirm the Firestore rules and Firebase configuration are active.</p>
        </div>
      `;
    });
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderFiles();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;

    filterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle("active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });

    renderFiles();
  });
});

adminAccessButton?.addEventListener("click", () => {
  window.location.href = "admin.html";
});

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "a") {
    event.preventDefault();
    window.location.href = "admin.html";
  }
});

updateFileCount();
loadPublicFiles();
