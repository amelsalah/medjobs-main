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
})();
