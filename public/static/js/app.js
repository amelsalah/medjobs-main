(function () {
  const form = document.getElementById("jobFilterForm");
  const filtersPanel = document.getElementById("filtersPanel");
  const toggleBtn = document.getElementById("toggleFiltersBtn");
  const qInput = document.getElementById("qInput");
  const clearBtn = document.getElementById("clearSearchBtn");
  const combobox = document.getElementById("searchCombobox");
  const dropdown = document.getElementById("suggestDropdown");
  const hospitalSelect = document.getElementById("filter-hospital");
  const citySelect = document.getElementById("filter-city");
  const employerSearch = document.getElementById("employerFilterSearch");
  const locationSearch = document.getElementById("locationFilterSearch");

  const TYPE_LABELS = {
    title: "Job title",
    employer: "Employer",
    location: "Location",
  };

  let suggestTimer = null;
  let activeIndex = -1;
  let currentSuggestions = [];

  if (toggleBtn && filtersPanel) {
    toggleBtn.addEventListener("click", () => {
      const open = filtersPanel.classList.toggle("is-open");
      toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function syncClearBtn() {
    if (!clearBtn || !qInput) return;
    clearBtn.style.display = (qInput.value || "").trim() ? "inline-flex" : "none";
  }

  function currentFilterParams() {
    const params = new URLSearchParams();
    if (hospitalSelect?.value) params.set("hospital", hospitalSelect.value);
    if (citySelect?.value) params.set("city", citySelect.value);
    return params.toString();
  }

  function closeSuggestions() {
    if (!dropdown) return;
    dropdown.hidden = true;
    dropdown.innerHTML = "";
    activeIndex = -1;
    currentSuggestions = [];
    qInput?.setAttribute("aria-expanded", "false");
  }

  function renderSuggestions(items, heading) {
    if (!dropdown) return;
    dropdown.innerHTML = "";
    if (!items.length) {
      dropdown.innerHTML = `<p class="suggest-empty">No suggestions — press Enter to search</p>`;
      dropdown.hidden = false;
      return;
    }
    if (heading) {
      const h = document.createElement("p");
      h.className = "suggest-heading";
      h.textContent = heading;
      dropdown.appendChild(h);
    }
    items.forEach((item, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "suggest-item";
      btn.role = "option";
      btn.dataset.index = String(i);
      btn.innerHTML = `
        <span class="suggest-item__type">${TYPE_LABELS[item.type] || item.type}</span>
        <span class="suggest-item__label">${escapeHtml(item.label)}</span>
        <span class="suggest-item__meta">${escapeHtml(item.meta || "")}</span>
      `;
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        window.location.href = item.href;
      });
      dropdown.appendChild(btn);
    });
    dropdown.hidden = false;
    qInput?.setAttribute("aria-expanded", "true");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function highlightActive() {
    if (!dropdown) return;
    dropdown.querySelectorAll(".suggest-item").forEach((el, i) => {
      el.classList.toggle("is-active", i === activeIndex);
    });
  }

  async function fetchSuggestions() {
    if (!qInput || !dropdown) return;
    const q = (qInput.value || "").trim();
    const extra = currentFilterParams();
    const url = `/api/suggest?q=${encodeURIComponent(q)}${extra ? `&${extra}` : ""}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      currentSuggestions = data.suggestions || [];
      const heading =
        q.length < 2 ? "Popular searches" : `Suggestions for “${q.length > 24 ? q.slice(0, 24) + "…" : q}”`;
      renderSuggestions(currentSuggestions, heading);
      activeIndex = -1;
    } catch {
      closeSuggestions();
    }
  }

  function scheduleSuggest() {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(fetchSuggestions, 220);
  }

  if (qInput) {
    qInput.addEventListener("input", () => {
      syncClearBtn();
      scheduleSuggest();
    });
    qInput.addEventListener("focus", () => {
      scheduleSuggest();
    });
    qInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeSuggestions();
        return;
      }
      if (!dropdown || dropdown.hidden) {
        if (e.key === "Enter") return;
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, currentSuggestions.length - 1);
        highlightActive();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        highlightActive();
      } else if (e.key === "Enter" && activeIndex >= 0 && currentSuggestions[activeIndex]) {
        e.preventDefault();
        window.location.href = currentSuggestions[activeIndex].href;
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (combobox && !combobox.contains(/** @type {Node} */ (e.target))) {
      closeSuggestions();
    }
  });

  if (clearBtn && form) {
    clearBtn.addEventListener("click", () => {
      if (qInput) qInput.value = "";
      syncClearBtn();
      closeSuggestions();
      form.requestSubmit();
    });
  }

  function filterSelectOptions(selectEl, query) {
    if (!selectEl) return;
    const q = (query || "").trim().toLowerCase();
    for (const opt of selectEl.options) {
      if (opt.value === "") {
        opt.hidden = false;
        continue;
      }
      const text = opt.textContent || "";
      opt.hidden = q.length > 0 && !text.toLowerCase().includes(q);
    }
  }

  if (employerSearch && hospitalSelect) {
    employerSearch.addEventListener("input", () => filterSelectOptions(hospitalSelect, employerSearch.value));
  }
  if (locationSearch && citySelect) {
    locationSearch.addEventListener("input", () => filterSelectOptions(citySelect, locationSearch.value));
  }

  syncClearBtn();

  // ----- Job detail modal -----
  const jobList = document.querySelector(".job-list");
  const overlay = document.getElementById("jobModalOverlay");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalAvatar = document.getElementById("modalJobAvatar");
  const modalTitle = document.getElementById("modalJobTitle");
  const modalOrg = document.getElementById("modalJobOrg");
  const modalLocation = document.getElementById("modalJobLocation");
  const modalDate = document.getElementById("modalJobDate");
  const modalDesc = document.getElementById("modalJobDesc");
  const modalApplyLink = document.getElementById("modalApplyLink");

  let lastFocused = null;

  function setMetaRow(el, text) {
    if (!el) return;
    if (text) {
      el.querySelector(".modal-meta__text").textContent = text;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  function openJobModal(card) {
    if (!overlay || !card) return;
    const title = card.dataset.title || "";
    const org = card.dataset.org || "";
    const location = card.dataset.location || "";
    const date = card.dataset.date || "";
    const url = card.dataset.url || "";
    const desc = card.dataset.desc || "";

    if (modalAvatar) modalAvatar.textContent = (org.trim().charAt(0) || "?").toUpperCase();
    if (modalTitle) modalTitle.textContent = title;
    if (modalOrg) modalOrg.textContent = org;
    setMetaRow(modalLocation, location);
    setMetaRow(modalDate, date ? `Posted ${date}` : "");
    if (modalDesc) {
      modalDesc.textContent = desc || "Full description and application steps are on the employer’s career portal.";
    }
    if (modalApplyLink) {
      if (url) {
        modalApplyLink.href = url;
        modalApplyLink.classList.remove("btn-apply--disabled");
        modalApplyLink.removeAttribute("aria-disabled");
      } else {
        modalApplyLink.removeAttribute("href");
        modalApplyLink.classList.add("btn-apply--disabled");
        modalApplyLink.setAttribute("aria-disabled", "true");
      }
    }

    lastFocused = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    document.body.classList.add("no-scroll");
    modalCloseBtn?.focus();
  }

  function closeJobModal() {
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    window.setTimeout(() => {
      overlay.hidden = true;
    }, 160);
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  }

  if (jobList) {
    jobList.addEventListener("click", (e) => {
      if (e.target.closest(".btn-apply")) return;
      const card = e.target.closest(".job-card");
      if (card) openJobModal(card);
    });
    jobList.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".job-card");
      if (!card) return;
      e.preventDefault();
      openJobModal(card);
    });
  }

  modalCloseBtn?.addEventListener("click", closeJobModal);
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeJobModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && !overlay.hidden) closeJobModal();
  });
})();
