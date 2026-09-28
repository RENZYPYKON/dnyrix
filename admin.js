const state = {
  user: null,
  files: [],
  editingFileId: null
};

const loginPage = document.getElementById("loginPage");
const dashboardPage = document.getElementById("dashboardPage");
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");
const loginButton = document.getElementById("loginButton");
const currentAdminEmail = document.getElementById("currentAdminEmail");
const adminFileCount = document.getElementById("adminFileCount");
const publishedCount = document.getElementById("publishedCount");
const adminStatus = document.getElementById("adminStatus");
const logoutButton = document.getElementById("logoutButton");
const adminFileList = document.getElementById("adminFileList");
const uploadModal = document.getElementById("uploadModal");
const uploadForm = document.getElementById("uploadForm");
const uploadModalTitle = document.getElementById("uploadModalTitle");
const uploadSubmitButton = uploadForm.querySelector("button[type='submit']");
const archiveFileInput = document.getElementById("archiveFileInput");
const archiveFileRow = archiveFileInput.closest(".form-row");
const displayNameInput = document.getElementById("displayNameInput");
const originalNameInput = document.getElementById("originalNameInput");
const typeInput = document.getElementById("typeInput");
const statusInput = document.getElementById("statusInput");
const sizeInput = document.getElementById("sizeInput");
const versionInput = document.getElementById("versionInput");
const descriptionInput = document.getElementById("descriptionInput");
const downloadUrlInput = document.getElementById("downloadUrlInput");
const releaseUrlInput = document.getElementById("releaseUrlInput");
const uploadMessage = document.getElementById("uploadMessage");

function isFirebaseConfigured() {
  return !!window.firebaseConfig && !window.firebaseConfig.apiKey.includes("YOUR_");
}

function setLoading(element, isLoading, label = "Login") {
  if (!element) return;
  const btnLabel = element.querySelector(".btn-label") || element;
  if (isLoading) {
    btnLabel.textContent = "Loading...";
    element.disabled = true;
  } else {
    btnLabel.textContent = label;
    element.disabled = false;
  }
}

function initFirebase() {
  if (!isFirebaseConfigured()) {
    loginError.textContent = "Firebase is not configured yet. Add your Firebase web config in firebase/firebase-config.js.";
    return false;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  return true;
}

function formatTimestamp(value) {
  if (!value) return "Recently";
  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function showNotification(message, type = "success") {
  uploadMessage.textContent = message;
  uploadMessage.className = `form-message ${type}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";

  const units = ["bytes", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  const decimals = value >= 10 || unitIndex === 0 ? 0 : 2;

  return `${Number(value).toFixed(decimals)} ${units[unitIndex]}`;
}

function inferDisplayNameFromFilename(fileName) {
  if (!fileName) return "";
  const cleaned = fileName.replace(/\.[^.]+$/, "");
  return cleaned.replace(/[._-]+/g, " ").trim();
}

function detectArchiveTypeFromName(fileName) {
  if (!fileName) return "";
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".zip")) return "ZIP";
  if (lowerName.endsWith(".rar")) return "RAR";
  return "";
}

function detectVersionFromReleaseUrl(value) {
  if (!value || !value.trim()) return "";

  try {
    const parsedUrl = new URL(value.trim());
    const tagMatch = parsedUrl.pathname.match(/\/releases\/tag\/(?:v)?([^/?#]+)/i);
    if (tagMatch && tagMatch[1]) {
      return tagMatch[1];
    }
  } catch (error) {
    return "";
  }

  return "";
}

function resetAddDownloadForm() {
  uploadForm.reset();
  state.editingFileId = null;
  uploadModalTitle.textContent = "Add Download";
  uploadSubmitButton.textContent = "Add Download";
  archiveFileRow.style.display = "";
  if (archiveFileInput) archiveFileInput.value = "";
  if (typeInput) typeInput.value = "";
  if (statusInput) statusInput.value = "Updated";
  if (displayNameInput) displayNameInput.value = "";
  if (originalNameInput) originalNameInput.value = "";
  if (sizeInput) {
    sizeInput.value = "";
    sizeInput.placeholder = "Size unavailable — enter manually";
  }
  if (versionInput) versionInput.value = "";
  if (descriptionInput) descriptionInput.value = "";
  if (downloadUrlInput) downloadUrlInput.value = "";
  if (releaseUrlInput) releaseUrlInput.value = "";
  if (uploadMessage) {
    uploadMessage.textContent = "";
    uploadMessage.className = "form-message";
  }
}

async function tryDetectRemoteFileSize(url) {
  if (!url || !url.trim()) return null;

  try {
    const response = await fetch(url.trim(), { method: "HEAD" });
    if (!response.ok) return null;

    const contentLength = Number(response.headers.get("Content-Length"));
    if (!Number.isFinite(contentLength) || contentLength <= 0) return null;

    return formatBytes(contentLength);
  } catch (error) {
    console.warn("Remote file size detection failed:", error);
    return null;
  }
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

async function ensureAdminAccess() {
  const authUser = firebase.auth().currentUser;
  if (!authUser) {
    throw new Error("Authentication required.");
  }

  const adminDoc = await firebase.firestore().collection("admins").doc(authUser.uid).get();
  if (!adminDoc.exists) {
    await firebase.auth().signOut();
    setUnauthenticatedView();
    throw new Error("Access denied.");
  }

  return authUser;
}

function validateDownloadForm(data) {
  if (!data.name || !data.name.trim()) {
    throw new Error("Please enter a file name.");
  }

  if (!data.originalName || !data.originalName.trim()) {
    throw new Error("Please enter the original file name.");
  }

  const type = (data.type || "").toUpperCase();
  if (!["ZIP", "RAR"].includes(type)) {
    throw new Error("Please select a valid file type.");
  }

  const originalLower = (data.originalName || "").toLowerCase();
  if (!originalLower.endsWith(".zip") && !originalLower.endsWith(".rar")) {
    throw new Error("Only ZIP and RAR files are supported.");
  }

  if (!data.size || !data.size.trim() || /^Size unavailable/i.test(data.size.trim())) {
    throw new Error("Unable to determine the remote file size. Please enter it manually.");
  }

  if (!data.version || !data.version.trim()) {
    throw new Error("Please enter a version.");
  }

  if (!data.downloadURL || !data.downloadURL.trim()) {
    throw new Error("Please enter the GitHub download URL.");
  }

  try {
    const parsed = new URL(data.downloadURL.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("The download URL must use http or https.");
    }
  } catch (error) {
    throw new Error("Please enter a valid GitHub download URL.");
  }

  if (data.releaseURL && data.releaseURL.trim()) {
    try {
      const parsed = new URL(data.releaseURL.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("The release URL must use http or https.");
      }
    } catch (error) {
      throw new Error("Please enter a valid GitHub Release URL.");
    }
  }
}

function renderAdminFiles() {
  if (!state.files.length) {
    adminFileList.innerHTML = `
      <div class="empty-state" aria-live="polite">
        <h3>No files uploaded yet</h3>
        <p>Add a GitHub Release asset to get started.</p>
      </div>
    `;
    adminFileCount.textContent = "0";
    publishedCount.textContent = "0";
    return;
  }

  const publishedTotal = state.files.filter((file) => file.published !== false).length;
  adminFileCount.textContent = String(state.files.length);
  publishedCount.textContent = String(publishedTotal);

  adminFileList.innerHTML = state.files
    .map((file) => {
      const status = (file.status || "Updated").trim();
      const statusClass = status.toLowerCase() === "under maintenance" || status.toLowerCase() === "maintenance"
        ? "maintenance"
        : status.toLowerCase();

      return `
        <div class="file-item" data-file-id="${file.id}">
          <div class="file-item-main">
            <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; margin-bottom:0.4rem;">
              <strong>${file.name}</strong>
              <span class="admin-status-pill ${statusClass}">${status}</span>
            </div>
            <div class="file-meta-inline">
              ${file.type || "FILE"} • ${file.size || "Unknown size"} • ${file.version || "v1.0"} • ${file.uploadedAt ? formatTimestamp(file.uploadedAt) : "Recently"}
            </div>
          </div>

          <div class="file-actions">
            <button class="action-btn edit-file" type="button" data-id="${file.id}">Edit</button>
            <button class="action-btn delete delete-file" type="button" data-id="${file.id}">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".delete-file").forEach((button) => {
    button.addEventListener("click", async () => {
      const fileId = button.dataset.id;
      const file = state.files.find((item) => item.id === fileId);

      if (!file) return;

      const confirmed = window.confirm("Delete this download?\n\nThis removes the file listing from Dnyrix.\n\nNote: The actual GitHub Release asset will NOT be deleted automatically.");
      if (!confirmed) return;

      try {
        const db = firebase.firestore();
        await db.collection("files").doc(fileId).delete();
        await loadAdminFiles();
        showToast("File removed from Dnyrix.");
      } catch (error) {
        console.error("Delete failed:", error);
        showToast("Delete failed. Please try again.", "error");
      }
    });
  });

  document.querySelectorAll(".edit-file").forEach((button) => {
    button.addEventListener("click", () => {
      const file = state.files.find((item) => item.id === button.dataset.id);
      if (!file) return;

      resetAddDownloadForm();
      state.editingFileId = file.id;
      uploadModalTitle.textContent = "Edit Download";
      uploadSubmitButton.textContent = "Save Changes";
      archiveFileRow.style.display = "none";
      displayNameInput.value = file.name || "";
      originalNameInput.value = file.originalName || "";
      typeInput.value = (file.type || "").toUpperCase();
      statusInput.value = file.status || "Updated";
      sizeInput.value = file.size || "";
      versionInput.value = file.version || "";
      descriptionInput.value = file.description || "";
      downloadUrlInput.value = file.downloadURL || "";
      releaseUrlInput.value = file.releaseURL || "";
      uploadModal.classList.remove("hidden");
      uploadModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  });
}

async function loadAdminFiles() {
  try {
    const db = firebase.firestore();
    let snapshot;

    try {
      snapshot = await db.collection("files").orderBy("uploadedAt", "desc").get();
    } catch (error) {
      console.warn("Falling back to unsorted admin file query:", error);
      snapshot = await db.collection("files").get();
    }

    state.files = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderAdminFiles();
  } catch (error) {
    console.error("Admin files load error:", error);
    adminFileList.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load files</h3>
        <p>Check your Firebase security rules and configuration.</p>
      </div>
    `;
  }
}

function setAuthenticatedView(user) {
  state.user = user;
  loginPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");
  currentAdminEmail.textContent = user.email || "Admin";
  adminStatus.textContent = "Active";
  loadAdminFiles();
}

function setUnauthenticatedView() {
  state.user = null;
  loginPage.classList.remove("hidden");
  dashboardPage.classList.add("hidden");
  loginError.textContent = "";
}

async function handleLogin(event) {
  event.preventDefault();

  if (!initFirebase()) {
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    loginError.textContent = "Invalid email or password.";
    return;
  }

  setLoading(loginButton, true, "Login");
  loginError.textContent = "";

  try {
    const auth = firebase.auth();
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;
    const db = firebase.firestore();
    const adminDoc = await db.collection("admins").doc(uid).get();

    if (!adminDoc.exists) {
      await auth.signOut();
      loginError.textContent = "Invalid email or password.";
      return;
    }

    showToast("Welcome to Dnyrix Admin.");
    setAuthenticatedView(userCredential.user);
  } catch (error) {
    console.error("Login failed:", error);
    loginError.textContent = "Invalid email or password.";
  } finally {
    setLoading(loginButton, false, "Login");
  }
}

async function handleLogout() {
  try {
    await firebase.auth().signOut();
    setUnauthenticatedView();
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

function openUploadModal() {
  resetAddDownloadForm();
  uploadModal.classList.remove("hidden");
  uploadModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeUploadModal() {
  uploadModal.classList.add("hidden");
  uploadModal.setAttribute("aria-hidden", "true");
  resetAddDownloadForm();
  document.body.style.overflow = "";
}

archiveFileInput.addEventListener("change", async () => {
  const selectedFile = archiveFileInput.files && archiveFileInput.files[0];

  if (!selectedFile) {
    return;
  }

  const fileName = selectedFile.name || "";
  const detectedType = detectArchiveTypeFromName(fileName);

  if (!detectedType) {
    showNotification("Only ZIP and RAR files are supported.", "error");
    archiveFileInput.value = "";
    return;
  }

  const displayName = inferDisplayNameFromFilename(fileName);
  if (!displayNameInput.value.trim()) {
    displayNameInput.value = displayName;
  }

  originalNameInput.value = fileName;
  typeInput.value = detectedType;
  sizeInput.value = formatBytes(selectedFile.size);
  sizeInput.placeholder = "Size unavailable — enter manually";
  showNotification("File metadata detected. Review before saving.", "success");
});

releaseUrlInput.addEventListener("input", () => {
  const suggestedVersion = detectVersionFromReleaseUrl(releaseUrlInput.value);
  if (suggestedVersion && !versionInput.value.trim()) {
    versionInput.value = suggestedVersion;
  }
});

downloadUrlInput.addEventListener("input", async () => {
  const suggestedVersion = detectVersionFromReleaseUrl(downloadUrlInput.value);
  if (suggestedVersion && !versionInput.value.trim()) {
    versionInput.value = suggestedVersion;
  }

  if (!sizeInput.value.trim() && downloadUrlInput.value.trim()) {
    const detectedSize = await tryDetectRemoteFileSize(downloadUrlInput.value);
    if (detectedSize) {
      sizeInput.value = detectedSize;
    }
  }
});

async function handleAddDownload(event) {
  event.preventDefault();

  if (!state.user) {
    showToast("Authentication required.", "error");
    return;
  }

  const payload = {
    name: displayNameInput.value.trim(),
    originalName: originalNameInput.value.trim(),
    type: (typeInput.value || "ZIP").trim().toUpperCase(),
    status: (statusInput.value || "Updated").trim(),
    size: sizeInput.value.trim(),
    version: versionInput.value.trim(),
    description: descriptionInput.value.trim(),
    downloadURL: downloadUrlInput.value.trim(),
    releaseURL: releaseUrlInput.value.trim()
  };

  try {
    validateDownloadForm(payload);
  } catch (error) {
    showNotification(error.message, "error");
    return;
  }

  try {
    const authUser = await ensureAdminAccess();
    const db = firebase.firestore();

    if (state.editingFileId) {
      const file = state.files.find((item) => item.id === state.editingFileId);
      if (!file) {
        throw new Error("The file being edited could not be found.");
      }

      await db.collection("files").doc(state.editingFileId).update({
        name: payload.name,
        originalName: payload.originalName,
        type: payload.type,
        status: payload.status,
        size: payload.size,
        version: payload.version,
        description: payload.description || "No description provided.",
        downloadURL: payload.downloadURL,
        releaseURL: payload.releaseURL || "",
        published: file.published !== false
      });

      showToast("File updated.");
      closeUploadModal();
      await loadAdminFiles();
      return;
    }

    await db.collection("files").add({
      name: payload.name,
      originalName: payload.originalName,
      type: payload.type,
      status: payload.status,
      size: payload.size,
      version: payload.version,
      description: payload.description || "No description provided.",
      downloadURL: payload.downloadURL,
      releaseURL: payload.releaseURL || "",
      uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
      uploadedBy: authUser.uid,
      published: true
    });

    showToast("Download added successfully.");
    closeUploadModal();
    await loadAdminFiles();
  } catch (error) {
    console.error("Add download failed:", error);
    if (error.message === "Access denied." || error.message === "Authentication required.") {
      showNotification("Invalid email or password.", "error");
      return;
    }
    showNotification("Could not add the download. Please try again.", "error");
  }
}

loginForm.addEventListener("submit", handleLogin);
logoutButton.addEventListener("click", handleLogout);

document.getElementById("openUploadModal").addEventListener("click", openUploadModal);
document.querySelector(".modal-close").addEventListener("click", closeUploadModal);
document.querySelectorAll("[data-close-modal='true']").forEach((element) => {
  element.addEventListener("click", closeUploadModal);
});
uploadForm.addEventListener("submit", handleAddDownload);

document.querySelector(".toggle-password").addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  document.querySelector(".toggle-password").textContent = isPassword ? "🙈" : "👁";
});

if (initFirebase()) {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      firebase.firestore().collection("admins").doc(user.uid).get().then((doc) => {
        if (doc.exists) {
          setAuthenticatedView(user);
        } else {
          firebase.auth().signOut();
          setUnauthenticatedView();
        }
      }).catch(() => {
        setUnauthenticatedView();
      });
    } else {
      setUnauthenticatedView();
    }
  });
} else {
  showToast("Firebase needs configuration before admin access works.", "error");
}
