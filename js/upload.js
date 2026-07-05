document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById("submitBtn");
  const statusDiv = document.getElementById("uploadStatus");

  const title = document.getElementById("title").value;
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value;
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) return;

  submitBtn.disabled = true;
  statusDiv.className = "status";
  statusDiv.innerText = "Uploading file to storage...";

  try {
    const fileExtension = file.name.split(".").pop();
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

    // Instantly invoke the browser list module layout update loop
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
