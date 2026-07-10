document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById("submitBtn");
  const statusDiv = document.getElementById("uploadStatus");
  const title = document.getElementById("title").value;
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value;
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  // 1. Ensure a file was actually selected
  if (!file) {
    statusDiv.className = "status error";
    statusDiv.innerText = "Please select a file to upload.";
    return;
  }

  // ==========================================
  // NEW: FILE VALIDATION CONFIGURATION
  // ==========================================
  const MAX_FILE_SIZE_MB = 15; // Set your limit (e.g., 15MB)
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  // Allowed academic file extensions
  const ALLOWED_EXTENSIONS = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "csv",
    "txt",
  ];

  // Get the file extension of the selected file
  const fileExtension = file.name.split(".").pop().toLowerCase();

  // A. Validate File Size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    statusDiv.className = "status error";
    statusDiv.innerText = `❌ File is too large! Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`;
    return; // Stops the upload immediately
  }

  // B. Validate File Type/Extension
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    statusDiv.className = "status error";
    statusDiv.innerText = `❌ Invalid file type! Allowed formats: ${ALLOWED_EXTENSIONS.join(", ").toUpperCase()}`;
    return; // Stops the upload immediately
  }
  // ==========================================

  // If validation passes, proceed with the upload
  submitBtn.disabled = true;
  statusDiv.className = "status";
  statusDiv.innerText = "Uploading file to storage...";

  try {
    // Generate a unique filename using the extension we already extracted
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExtension}`;

    // A. Upload physical file
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

    // B. Insert metadata
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
      }),
    });

    if (!dbResponse.ok) {
      const errData = await dbResponse.json();
      throw new Error(errData.message || "Database insert failed");
    }

    statusDiv.className = "status success";
    statusDiv.innerText = "🎉 Resource uploaded successfully!";
    document.getElementById("uploadForm").reset();

    if (typeof loadResources === "function") {
      loadResources();
    }
  } catch (error) {
    console.error(error);
    statusDiv.className = "status error";
    statusDiv.innerText = `Error: ${error.message}`;
  } finally {
    submitBtn.disabled = false;
  }
});
