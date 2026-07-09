const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let localFiles = [];

// Helper to format file sizes cleanly (e.g. 1.2 MB)
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
function renderUI() {
  const container = document.getElementById("resourceContainer");
  container.innerHTML = "";

  if (localFiles.length === 0) {
    container.innerHTML =
      '<p class="loading-text">No resources uploaded yet.</p>';
    return;
  }

  localFiles.forEach((item) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "resource-item";

    itemDiv.innerHTML = `
        <div class="resource-info">
            <h3 class="resource-title">${item.title}</h3>
            <div class="resource-meta" style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
                <span class="category-badge">${item.category}</span>
                <span style="background: #ecfdf5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 12px;">🎓 ${item.level || "N/A"}</span>
                <span style="background: #f3f4f6; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 12px;">✍️ ${item.author || "Unknown"}</span>
                <span>• ${formatBytes(item.file_size)}</span>
            </div>
            <p class="resource-desc">${item.description || "No description provided."}</p>
        </div>
        <a href="${item.file_url}" target="_blank" download="${item.title}" class="download-btn">📥 Download</a>
    `;
    container.appendChild(itemDiv);
  });
}

// Connects to Supabase and waits for you to delete a row in the dashboard
function listenToLiveChanges() {
  supabaseClient
    .channel("schema-db-changes")
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "resources" },
      (payload) => {
        const deletedId = payload.old.id;
        // Remove the item from browser memory instantly
        localFiles = localFiles.filter((file) => file.id !== deletedId);
        // Refresh the screen elements
        renderUI();
      },
    )
    .subscribe();
}

// Fetch and display resources from the Supabase database
async function loadResources() {
  const container = document.getElementById("resourceContainer");
  const loadingText = document.getElementById("loadingText");
  // Draws the UI dynamically based on what is inside the localFiles array
  try {
    const dbUrl = `${SUPABASE_URL}/rest/v1/resources?select=*&order=created_at.desc`;
    const response = await fetch(dbUrl, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Cache-Control": "no-cache, no-store, must-revalidate", // FORCES FRESH DATA
        Pragma: "no-cache",
        Expires: "0",
      },
    });
    // Save the downloaded database items into our memory array
    localFiles = await response.json();
    loadingText.style.display = "none";

    // Call the new rendering function to draw them on the screen
    renderUI();

    if (!response.ok) throw new Error("Failed to fetch data from hub");
  } catch (error) {
    console.error(error);
    loadingText.className = "status error";
    loadingText.innerText = `Could not load list: ${error.message}`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadResources();
  listenToLiveChanges(); // Automatically boots up the live listening system
});
