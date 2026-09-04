// ==========================================
// 1. DOM ELEMENT REFERENCES
// ==========================================
const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const submitBtn = document.getElementById("submitBtn");
const statusDiv = document.getElementById("uploadStatus");
const promptText = document.getElementById("fileTextPrompt");
const fileNameDisplay = document.getElementById("chosenFileName");

// ==========================================
// 2. LIVE FILE CHOICE STATE LISTENER
// ==========================================
fileInput.addEventListener("change", (e) => {
  const selectedFile = e.target.files[0];

  if (selectedFile) {
    fileNameDisplay.innerText = `📄 Selected: ${selectedFile.name}`;
    fileNameDisplay.style.display = "block";
    if (promptText) promptText.innerText = "Change selected file";
  } else {
    fileNameDisplay.style.display = "none";
    if (promptText) promptText.innerText = "Click to select file from device";
  }
});

// ==========================================
// 3. SECURE FORM SUBMISSION EVENT
// ==========================================
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Extract Form Data
  const title = document.getElementById("title").value.trim();
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value.trim();
  const level = document.getElementById("level").value;
  const author = document.getElementById("author").value.trim();
  const doi = document.getElementById("doi")
    ? document.getElementById("doi").value.trim()
    : "";

  const file = fileInput.files[0];
  if (!file) {
    statusDiv.className = "status error";
    statusDiv.innerText = "Please select a file to upload.";
    return;
  }

  // File Validation Rules
  const MAX_FILE_SIZE_MB = 15;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const ALLOWED_EXTENSIONS = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "csv",
    "txt",
  ];
  const fileExtension = file.name.split(".").pop().toLowerCase();

  if (file.size > MAX_FILE_SIZE_BYTES) {
    statusDiv.className = "status error";
    statusDiv.innerText = `❌ File too large! Max is ${MAX_FILE_SIZE_MB}MB.`;
    return;
  }

  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    statusDiv.className = "status error";
    statusDiv.innerText = `❌ Invalid file type! Allowed: ${ALLOWED_EXTENSIONS.join(", ").toUpperCase()}`;
    return;
  }

  // Lock UI Controls
  submitBtn.disabled = true;
  statusDiv.className = "status";
  statusDiv.innerText = "Uploading file to storage...";

  let uniqueFileName = ""; // Stored outside block scope for potential catch block operations

  try {
    uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExtension}`;

    // A. Upload physical file binary to cloud storage bucket
    const storageUrl = `${SUPABASE_URL}/storage/v1/object/Files/${uniqueFileName}`;
    const storageResponse = await fetch(storageUrl, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!storageResponse.ok) {
      const errData = await storageResponse.json();
      throw new Error(errData.message || "Storage upload failed");
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/Files/${uniqueFileName}`;
    statusDiv.innerText = "Saving file details to database...";

    // B. Write relational metadata entries to resources index
    const dbUrl = `${SUPABASE_URL}/rest/v1/resources`;
    const dbResponse = await fetch(dbUrl, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        title: title,
        category: category,
        description: description,
        file_url: publicUrl,
        file_size: file.size,
        level: level,
        author: author,
        doi: doi || null,
      }),
    });

    if (!dbResponse.ok) {
      const errData = await dbResponse.json();
      throw new Error(errData.message || "Database insert failed");
    }

    // Success State Reset Loops
    statusDiv.className = "status success";
    statusDiv.innerText = "🎉 Academic resource uploaded successfully!";
    uploadForm.reset();

    // UI Label Reset Adjustments
    fileNameDisplay.style.display = "none";
    if (promptText) promptText.innerText = "Click to select file from device";

    if (typeof loadResources === "function") {
      loadResources();
    }
  } catch (error) {
    console.error(error);
    statusDiv.className = "status error";
    statusDiv.innerText = `Error: ${error.message}`;

    // CHALLENGE FIX: Attempt cleanup if DB storage registration breaks mid-flight
    if (uniqueFileName && error.message.includes("Database")) {
      try {
        await fetch(
          `${SUPABASE_URL}/storage/v1/object/Files/${uniqueFileName}`,
          {
            method: "DELETE",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          },
        );
      } catch (cleanupError) {
        console.error("Orphaned storage element cleanup failed:", cleanupError);
      }
    }
  } finally {
    submitBtn.disabled = false;
  }
});
