// Helper to format file sizes cleanly (e.g. 1.2 MB)
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Fetch and display resources from the Supabase database
async function loadResources() {
  const container = document.getElementById("resourceContainer");
  const loadingText = document.getElementById("loadingText");

  try {
    const dbUrl = `${SUPABASE_URL}/rest/v1/resources?select=*&order=created_at.desc`;
    const response = await fetch(dbUrl, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch data from hub");

    const files = await response.json();
    container.innerHTML = "";
    loadingText.style.display = "none";

    if (files.length === 0) {
      container.innerHTML =
        '<p class="loading-text">No resources uploaded yet.</p>';
      return;
    }

    files.forEach((item) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "resource-item";

      itemDiv.innerHTML = `
                <div class="resource-info">
                    <h3 class="resource-title">${item.title}</h3>
                    <div class="resource-meta">
                        <span class="category-badge">${item.category}</span>
                        <span>• ${formatBytes(item.file_size)}</span>
                    </div>
                    <p class="resource-desc">${item.description || "No description provided."}</p>
                </div>
                <a href="${item.file_url}" target="_blank" download="${item.title}" class="download-btn">📥 Download</a>
            `;
      container.appendChild(itemDiv);
    });
  } catch (error) {
    console.error(error);
    loadingText.className = "status error";
    loadingText.innerText = `Could not load list: ${error.message}`;
  }
}

// Automatically load files on window instantiation
window.addEventListener("DOMContentLoaded", loadResources);
