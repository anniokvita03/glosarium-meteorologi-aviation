const CSV_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vT1pZZXCwj88_g99qjDIqIm3i2vcHzmCDvAgYK0vOQzN1RE4fl20VcnbpYewLOQdQ/pub?gid=1600430165&single=true&output=csv";

let glossary = [];

/* ===========================
   CSV PARSER
   =========================== */
async function loadCSV() {
    const res = await fetch(CSV_URL);
    const text = await res.text();

    let rows = [];
    let row = [];
    let cur = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        let c = text[i];

        if (c === '"' && text[i+1] === '"') {
            cur += '"';
            i++;
        } else if (c === '"') {
            insideQuotes = !insideQuotes;
        } else if (c === ',' && !insideQuotes) {
            row.push(cur.trim());
            cur = "";
        } else if ((c === '\n' || c === '\r') && !insideQuotes) {
            if (cur || row.length) {
                row.push(cur.trim());
                rows.push(row);
                row = [];
                cur = "";
            }
        } else {
            cur += c;
        }
    }

    return rows;
}

/* ===========================
   PROCESS CSV → OBJECT
   =========================== */
function processCSV(rows) {
    // header di index 0
    glossary = rows.slice(1).map(r => ({
        term: r[0] || "",
        term_en: r[1] || "",
        term_id: r[2] || "",
        def_en: r[3] || "",
        def_id: r[4] || "",
        category: r[5] || ""       // Kategori di kolom 6
    }));
}

/* ===========================
   SEARCH ENGINE
   =========================== */
function search(keyword) {
    keyword = keyword.toLowerCase();

    let exact = [];
    let phrase = [];
    let defmatch = [];

    glossary.forEach(item => {
        const term = item.term.toLowerCase();
        const term_en = item.term_en.toLowerCase();
        const term_id = item.term_id.toLowerCase();
        const def_en = item.def_en.toLowerCase();
        const def_id = item.def_id.toLowerCase();

        // EXACT MATCH
        if (
            term === keyword ||
            term_en === keyword ||
            term_id === keyword
        ) {
            exact.push(item);
            return;
        }

        // PHRASE MATCH
        let posList = [];

        if (term.includes(keyword)) posList.push(term.indexOf(keyword));
        if (term_en.includes(keyword)) posList.push(term_en.indexOf(keyword));
        if (term_id.includes(keyword)) posList.push(term_id.indexOf(keyword));

        if (posList.length > 0) {
            item._pos = Math.min(...posList);
            phrase.push(item);
            return;
        }

        // DEFINITION MATCH
        if (def_en.includes(keyword) || def_id.includes(keyword)) {
            defmatch.push(item);
        }
    });

    phrase.sort((a, b) => a._pos - b._pos);

    return [...exact, ...phrase, ...defmatch];
}

/* ===========================
   HIGHLIGHT
   =========================== */
function highlight(text, keyword) {
    if (!keyword) return text;
    const reg = new RegExp(`(${keyword})`, "gi");
    return text.replace(reg, `<mark>$1</mark>`);
}

/* ===========================
   DISPLAY RESULT (SLIDE EXPAND)
   =========================== */
function display(list, keyword = "") {
    const div = document.getElementById("results");
    div.innerHTML = "";

    if (!list || list.length === 0) {
        div.innerHTML = `<p class="no-results">Tidak ada hasil ditemukan.</p>`;
        return;
    }

    list.forEach(item => {
        const box = document.createElement("div");
        box.className = "result";

        const header = document.createElement("div");
        header.className = "result-header";

        header.innerHTML = `
            <div>
                <strong>${highlight(item.term, keyword)}</strong><br>
                ${item.term_en ? `<small>${highlight(item.term_en, keyword)}</small><br>` : ""}
                ${item.term_id ? `<small>${highlight(item.term_id, keyword)}</small><br>` : ""}

            </div>
            <i class="fa fa-chevron-right arrow"></i>
        `;

        const detail = document.createElement("div");
        detail.className = "result-detail";
        detail.innerHTML = `
            <p class="label">Definition (EN):</p>
            ${highlight(item.def_en, keyword)}<br><br>

            <p class="label">Definisi (ID):</p>
            ${highlight(item.def_id, keyword)}
        `;

        const arrow = header.querySelector(".arrow");

        header.addEventListener("click", () => {
            detail.classList.toggle("open");
            arrow.classList.toggle("rotate");
        });

        box.appendChild(header);
        box.appendChild(detail);
        div.appendChild(box);
    });
}

/* ===========================
   FILTER BY CATEGORY
   =========================== */
function filterCategory(cat) {
    const filtered = glossary.filter(item => {
        if (!item.category) return false;

        const cats = item.category
            .toLowerCase()
            .split(",")
            .map(s => s.trim());

        return cats.includes(cat.toLowerCase());
    });

    display(filtered);
}

/* ===========================
   INIT
   =========================== */
async function init() {
    const rows = await loadCSV();
    processCSV(rows);

    // tampilkan semua data waktu load awal
    display(glossary);
}

init();

/* ===========================
   SEARCH INPUT
   =========================== */
const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("input", e => {
    const keyword = e.target.value;
    const result = search(keyword);
    display(result, keyword);
});

/* ===========================
   CATEGORY BUTTONS
   =========================== */
document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const cat = btn.dataset.category;
        filterCategory(cat);
    });
});


/* ===========================
   DARK MODE TOGGLE
=========================== */
const themeBtn = document.getElementById("themeToggle");

themeBtn.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");

    // Ubah icon
    if (document.documentElement.classList.contains("dark")) {
        themeBtn.textContent = "☀️";
    } else {
        themeBtn.textContent = "🌙";
    }
});

/* ==========================
   MOBILE CATEGORY TOGGLE
========================== */
const mobileBtn = document.querySelector(".mobile-cat-toggle");
const mobileMenu = document.querySelector(".mobile-cat-menu");

if (mobileBtn) {
    mobileBtn.addEventListener("click", () => {
        mobileMenu.style.display =
            mobileMenu.style.display === "block" ? "none" : "block";
    });
}
