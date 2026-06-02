/* ── config ── *
 * These placeholders get replaced at deploy time via
 * the GitHub Actions workflow (.github/workflows/deploy.yml)
 * using the repository secrets of the same name.
 */
const UPLOADPASS = "secrets.UPLOADPASS";
const ACCTOKEN   = "secrets.ACCTOKEN";
const REPO       = "Spewku/Spewku.github.io";
const XML_PATH   = "artData.xml";

/* ── helpers ── */
function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildXml(data) {
  const indent = (lvl) => "  ".repeat(lvl);

  const images = data.carouselImages
    .filter((url) => url.trim().length > 0)
    .map((url) => `${indent(2)}<image url="${escapeXml(url.trim())}" />`)
    .join("\n");

  const embedPart =
    data.includeEmbed && data.embedCode.trim()
      ? `\n${indent(2)}<embed><![CDATA[\n${data.embedCode}\n${indent(2)}]]></embed>`
      : "";

  return [
    "  <artPost>",
    `${indent(1)}<metadata>`,
    `${indent(2)}<type>${data.isPersonal ? "personal" : "professional"}</type>`,
    `${indent(2)}<is3D>${data.is3D}</is3D>`,
    `${indent(2)}<title>${escapeXml(data.title)}</title>`,
    `${indent(2)}<description>${escapeXml(data.description)}</description>`,
    `${indent(2)}<sourceLink>${escapeXml(data.sourceLink)}</sourceLink>`,
    `${indent(1)}</metadata>`,
    `${indent(1)}<carousel>`,
    images || `${indent(2)}<!-- no images specified -->`,
    embedPart,
    `${indent(1)}</carousel>`,
    "  </artPost>",
  ].join("\n");
}

async function fetchCurrentXml(token) {
  const url = `https://api.github.com/repos/${REPO}/contents/${XML_PATH}`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) throw new Error(`Failed to fetch current XML (${res.status})`);
  return res.json();
}

async function commitToGithub(token, newEntryXml) {
  const { content: currentBase64, sha } = await fetchCurrentXml(token);

  const decoded = atob(currentBase64);

  let updated;
  if (decoded.includes("<artData>")) {
    const insertBefore = "</artData>";
    updated = decoded.replace(insertBefore, `${newEntryXml}\n${insertBefore}`);
  } else {
    updated = `<?xml version="1.0" encoding="UTF-8"?>\n<artData>\n${newEntryXml}\n</artData>\n`;
  }

  const newBase64 = btoa(unescape(encodeURIComponent(updated)));

  const body = {
    message: "Add new art post via upload",
    content: newBase64,
    sha,
  };

  const url = `https://api.github.com/repos/${REPO}/contents/${XML_PATH}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GitHub API error (${res.status}): ${err.message}`);
  }

  return res.json();
}

/* ── gate ── */
function initGate() {
  const gate = document.getElementById("gate");
  const app = document.getElementById("app");
  const gatePass = document.getElementById("gatePass");
  const gateBtn = document.getElementById("gateBtn");
  const gateError = document.getElementById("gateError");

  const unlock = () => {
    gate.style.display = "none";
    app.style.display = "grid";
  };

  gateBtn.addEventListener("click", () => {
    if (gatePass.value === UPLOADPASS) {
      gateError.textContent = "";
      unlock();
    } else {
      gateError.textContent = "Invalid password";
      gatePass.value = "";
      gatePass.focus();
    }
  });

  gatePass.addEventListener("keydown", (e) => {
    if (e.key === "Enter") gateBtn.click();
  });
}

/* ── main form ── */
function initForm() {
  const workTypeHidden = document.getElementById("workType");
  const dimensionHidden = document.getElementById("dimension");
  const toggleGroups = document.querySelectorAll(".toggle-group");
  const includeEmbedCheckbox = document.getElementById("includeEmbed");
  const embedRow = document.getElementById("embedRow");
  const generateBtn = document.getElementById("generateBtn");
  const commitBtn = document.getElementById("commitBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const output = document.getElementById("xmlOutput");
  const statusMsg = document.getElementById("statusMsg");

  toggleGroups.forEach((group) => {
    const buttons = group.querySelectorAll(".toggle");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const hidden = group.querySelector('input[type="hidden"]');
        if (hidden) hidden.value = btn.dataset.value;
      });
    });
  });

  const updateEmbedVisibility = () => {
    embedRow.style.display = includeEmbedCheckbox.checked ? "flex" : "none";
  };
  includeEmbedCheckbox.addEventListener("change", updateEmbedVisibility);
  updateEmbedVisibility();

  let lastXml = "";

  generateBtn.addEventListener("click", () => {
    const data = {
      isPersonal: workTypeHidden.value === "personal",
      is3D: dimensionHidden.value === "true",
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      sourceLink: document.getElementById("sourceLink").value.trim(),
      carouselImages: document.getElementById("carouselImages").value.split(/\r?\n/),
      includeEmbed: includeEmbedCheckbox.checked,
      embedCode: document.getElementById("embedCode").value,
    };

    const xml = buildXml(data);
    lastXml = xml;
    output.textContent = xml;
    downloadBtn.disabled = false;
    commitBtn.disabled = !ACCTOKEN;
    statusMsg.textContent = "";
  });

  downloadBtn.addEventListener("click", () => {
    if (!lastXml) return;
    const title = document.getElementById("title").value;
    const blob = new Blob([lastXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = title.trim().replace(/[^\w-]+/g, "_") || "art_post";
    a.href = url;
    a.download = `${safeTitle}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  commitBtn.addEventListener("click", async () => {
    if (!lastXml) return;
    if (!ACCTOKEN) {
      statusMsg.textContent = "ACCTOKEN not configured — set it in main.js";
      statusMsg.className = "status-msg error";
      return;
    }

    commitBtn.disabled = true;
    statusMsg.textContent = "Fetching current XML from GitHub...";
    statusMsg.className = "status-msg";

    try {
      const result = await commitToGithub(ACCTOKEN, lastXml);
      statusMsg.textContent = `Committed! SHA: ${result.content.sha.slice(0, 7)}`;
      statusMsg.className = "status-msg success";
    } catch (e) {
      statusMsg.textContent = `Error: ${e.message}`;
      statusMsg.className = "status-msg error";
      commitBtn.disabled = true;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initGate();
  initForm();
});
