/* ===== STATE ===== */
let allStudents = [];
let filteredStudents = [];
let currentPage = 'dashboard';
let portfolioLookup = {}; // NIM -> [{ semester, semName, course, link_UTS, link_UAS }]

/* ===== HELPERS ===== */
function showLoading(show) {
    const el = document.getElementById('loadOverlay');
    if (show) { el.classList.remove('hidden'); el.style.display = 'flex'; }
    else { el.classList.add('hidden'); setTimeout(() => el.style.display = 'none', 500); }
}

function deriveAngkatan(nim) {
    const s = String(nim);
    if (s.length >= 2) {
        const yr = parseInt(s.substring(0, 2));
        return yr > 50 ? 1900 + yr : 2000 + yr;
    }
    return null;
}

function extractSemesterFromKelas(kelasRaw) {
    if (!kelasRaw) return null;
    // Extract leading number from kelas string, e.g. "4 Sains Data Reg (Online)" → 4
    const match = String(kelasRaw).match(/^(\d+)/);
    return match ? parseInt(match[1]) : null;
}

function extractKelasType(kelas) {
    if (!kelas) return 'Lainnya';
    const lower = kelas.toLowerCase();
    if (lower.includes('aksel')) return 'Akselerasi';
    if (lower.includes('pro')) return 'Profesional';
    if (lower.includes('reg')) return 'Reguler';
    return 'Lainnya';
}

/* ===== NAVIGATION ===== */
function navigateTo(page, data) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    currentPage = page;
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');

    const navEl = document.getElementById('nav-' + page);
    if (navEl) navEl.classList.add('active');

    // Update breadcrumb
    updateBreadcrumb(page, data);

    // Page-specific init
    if (page === 'semester') renderSemesterGrid();
    if (page === 'course' && data) loadCoursePortfolio(data.semId, data.courseName);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateBreadcrumb(page, data) {
    const bc = document.getElementById('breadcrumb').querySelector('.container') || document.getElementById('breadcrumb');
    let html = '<a href="#" onclick="navigateTo(\'dashboard\')">Dashboard</a>';
    if (page === 'semester') {
        html += '<span class="sep">›</span><span class="current">Kurikulum</span>';
    } else if (page === 'course' && data) {
        html += '<span class="sep">›</span><a href="#" onclick="navigateTo(\'semester\')">Kurikulum</a>';
        html += '<span class="sep">›</span><span class="current">' + data.courseName + '</span>';
    }
    bc.innerHTML = html;
}

/* ===== LOAD EXCEL DATA ===== */
async function fetchExcel(filename) {
    const resp = await fetch(filename);
    const ab = await resp.arrayBuffer();
    return XLSX.read(ab, { type: 'array' });
}

async function loadStudentData() {
    showLoading(true);
    try {
        // Load portfolio lookup first so it's ready when table renders
        await loadPortfolioLookup();

        const wb = await fetchExcel('data_mahasiswa.xlsx');
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws);

        allStudents = raw.map(row => {
            const nim = row['NIM'] || row['nim'] || '';
            const nama = row['Nama'] || row['nama'] || '';
            const kelasRaw = row['Kelas Perkuliahan'] || row['Kelas'] || row['kelas'] || '';
            const kelas = extractKelasType(kelasRaw);
            const angkatan = deriveAngkatan(nim);
            const semester = extractSemesterFromKelas(kelasRaw);
            return { nim, nama, kelas, kelasRaw, angkatan, semester };
        });

        populateFilters();
        applyFilters();
        updateStats();
    } catch (err) {
        console.error('Error loading student data:', err);
    }
    showLoading(false);
}

/* ===== PORTFOLIO LOOKUP ===== */
async function loadPortfolioLookup() {
    portfolioLookup = {};
    const entries = Object.entries(PORTFOLIO_FILES);
    for (const [semId, file] of entries) {
        try {
            const sem = CURRICULUM.find(s => s.id === semId);
            const semName = sem ? sem.name : semId;
            const wb = await fetchExcel(file);
            for (const sheetName of wb.SheetNames) {
                const ws = wb.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(ws);
                data.forEach(row => {
                    const nim = String(row['NIM'] || row['nim'] || '').trim();
                    if (!nim) return;
                    const linkUTS = row['link_UTS'] || row['Link_UTS'] || row['link_uts'] || '';
                    const linkUAS = row['link_UAS'] || row['Link_UAS'] || row['link_uas'] || '';
                    if (!portfolioLookup[nim]) portfolioLookup[nim] = [];
                    portfolioLookup[nim].push({
                        semester: semId,
                        semName: semName,
                        course: sheetName,
                        link_UTS: linkUTS,
                        link_UAS: linkUAS
                    });
                });
            }
        } catch (err) {
            console.error('Error loading portfolio file:', file, err);
        }
    }
    console.log('Portfolio lookup built:', Object.keys(portfolioLookup).length, 'students');
}

/* ===== FILTERS ===== */
function populateFilters() {
    const angkatanSet = new Set();
    const semesterSet = new Set();
    const kelasSet = new Set();

    allStudents.forEach(s => {
        if (s.angkatan) angkatanSet.add(s.angkatan);
        if (s.semester) semesterSet.add(s.semester);
        if (s.kelas) kelasSet.add(s.kelas);
    });

    fillSelect('filterAngkatan', [...angkatanSet].sort(), v => v);
    fillSelect('filterSemester', [...semesterSet].sort((a, b) => a - b), v => 'Semester ' + v);
    fillSelect('filterKelas', [...kelasSet].sort(), v => v);
}

function fillSelect(id, values, labelFn) {
    const sel = document.getElementById(id);
    const current = sel.value;
    // Keep first option
    while (sel.options.length > 1) sel.remove(1);
    values.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = labelFn(v);
        sel.appendChild(opt);
    });
    sel.value = current;
}

function applyFilters() {
    const angkatan = document.getElementById('filterAngkatan').value;
    const semester = document.getElementById('filterSemester').value;
    const kelas = document.getElementById('filterKelas').value;
    const search = document.getElementById('filterSearch').value.toLowerCase().trim();

    filteredStudents = allStudents.filter(s => {
        if (angkatan && String(s.angkatan) !== angkatan) return false;
        if (semester && String(s.semester) !== semester) return false;
        if (kelas && s.kelas !== kelas) return false;
        if (search && !s.nama.toLowerCase().includes(search)) return false;
        return true;
    });

    renderStudentTable();
    document.getElementById('statFiltered').textContent = filteredStudents.length;
    document.getElementById('resultCount').textContent = filteredStudents.length + ' mahasiswa';
}

function resetFilters() {
    document.getElementById('filterAngkatan').value = '';
    document.getElementById('filterSemester').value = '';
    document.getElementById('filterKelas').value = '';
    document.getElementById('filterSearch').value = '';
    applyFilters();
}

function updateStats() {
    document.getElementById('statTotal').textContent = allStudents.length;
    const kelasSet = new Set(allStudents.map(s => s.kelas));
    document.getElementById('statKelas').textContent = kelasSet.size;
}

/* ===== RENDER STUDENT TABLE ===== */
function renderStudentTable() {
    const tbody = document.getElementById('studentBody');
    const empty = document.getElementById('emptyState');

    if (filteredStudents.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    tbody.innerHTML = filteredStudents.map((s, i) => {
        const nimStr = String(s.nim).trim();
        const hasPortfolio = portfolioLookup[nimStr] && portfolioLookup[nimStr].length > 0;
        const portfolioCell = hasPortfolio
            ? `<button class="portfolio-btn" onclick="openPortfolioModal('${nimStr}', '${s.nama.replace(/'/g, "\\'")}')">📂 Lihat Portfolio <span class="portfolio-count">${portfolioLookup[nimStr].length}</span></button>`
            : `<span style="color:var(--text-muted)">—</span>`;

        return `<tr class="${hasPortfolio ? 'has-portfolio' : ''}">
            <td>${i + 1}</td>
            <td>${s.nim}</td>
            <td>${s.nama}</td>
            <td>${s.angkatan || '-'}</td>
            <td>${s.semester || '-'}</td>
            <td>${s.kelas || '-'}</td>
            <td>${portfolioCell}</td>
        </tr>`;
    }).join('');
}

/* ===== PORTFOLIO MODAL ===== */
function openPortfolioModal(nim, nama) {
    const modal = document.getElementById('portfolioModal');
    const nameEl = document.getElementById('modalStudentName');
    const nimEl = document.getElementById('modalStudentNIM');
    const bodyEl = document.getElementById('modalBody');
    const avatarEl = document.getElementById('modalAvatar');

    nameEl.textContent = nama;
    nimEl.textContent = 'NIM: ' + nim;
    avatarEl.textContent = nama.charAt(0).toUpperCase();

    const entries = portfolioLookup[nim] || [];
    if (entries.length === 0) {
        bodyEl.innerHTML = '<div class="modal-empty">📭 Belum ada data portfolio</div>';
    } else {
        // Group by semester
        const grouped = {};
        entries.forEach(e => {
            if (!grouped[e.semName]) grouped[e.semName] = [];
            grouped[e.semName].push(e);
        });

        let html = '';
        Object.entries(grouped).forEach(([semName, courses]) => {
            html += `<div class="modal-semester-group">`;
            html += `<div class="modal-sem-header"><span class="modal-sem-icon">📚</span><h3>${semName}</h3><span class="modal-sem-count">${courses.length} mata kuliah</span></div>`;
            html += `<div class="modal-courses">`;
            courses.forEach(c => {
                const utsBtn = c.link_UTS
                    ? `<a href="${c.link_UTS}" target="_blank" rel="noopener" class="modal-link-btn modal-link-uts">📝 UTS</a>`
                    : `<span class="modal-link-na">UTS —</span>`;
                const uasBtn = c.link_UAS
                    ? `<a href="${c.link_UAS}" target="_blank" rel="noopener" class="modal-link-btn modal-link-uas">📋 UAS</a>`
                    : `<span class="modal-link-na">UAS —</span>`;
                html += `<div class="modal-course-card">
                    <div class="modal-course-name">📖 ${c.course}</div>
                    <div class="modal-course-links">${utsBtn}${uasBtn}</div>
                </div>`;
            });
            html += `</div></div>`;
        });
        bodyEl.innerHTML = html;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePortfolioModal(event, forceClose) {
    const modal = document.getElementById('portfolioModal');
    if (forceClose || event.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('portfolioModal');
        if (modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

/* ===== RENDER SEMESTER GRID ===== */
function renderSemesterGrid() {
    const grid = document.getElementById('semesterGrid');
    grid.innerHTML = CURRICULUM.map(sem => {
        const courseItems = sem.courses.map(c => {
            const hasData = c.hasPortfolio && PORTFOLIO_FILES[sem.id];
            const clickClass = hasData ? 'clickable' : '';
            const onclick = hasData
                ? `onclick="navigateTo('course', {semId:'${sem.id}', courseName:'${c.name.replace(/'/g, "\\'")}'})"` : '';
            const note = c.note ? `<span class="sem-desc">(${c.note})</span>` : '';
            return `<li class="course-item ${clickClass}" ${onclick}>
                <span>${c.name} ${note}</span>
                <span class="sks">${c.sks > 0 ? c.sks + ' SKS' : ''}</span>
            </li>`;
        }).join('');

        return `<div class="sem-card">
            <div class="sem-card-head">
                <h3>${sem.name}</h3>
                <span class="sem-badge">${sem.sks} SKS</span>
            </div>
            <div class="sem-card-body">
                <p>${sem.desc}</p>
                <ul class="course-list">${courseItems}</ul>
            </div>
        </div>`;
    }).join('');
}

/* ===== LOAD COURSE PORTFOLIO ===== */
async function loadCoursePortfolio(semId, courseName) {
    const titleEl = document.getElementById('courseTitle');
    const subEl = document.getElementById('courseSub');
    titleEl.innerHTML = courseName + ' <span class="gtext">Portfolio</span>';

    const sem = CURRICULUM.find(s => s.id === semId);
    subEl.textContent = sem ? `${sem.name} — ${sem.desc}` : '';

    const file = PORTFOLIO_FILES[semId];
    if (!file) {
        document.getElementById('portfolioBody').innerHTML = '';
        document.getElementById('portfolioEmpty').style.display = 'block';
        document.getElementById('statPortfolio').textContent = '0';
        document.getElementById('portfolioCount').textContent = '0 mahasiswa';
        return;
    }

    showLoading(true);
    try {
        const wb = await fetchExcel(file);
        // Find the sheet matching the course name
        const sheetName = wb.SheetNames.find(s =>
            s.toLowerCase().trim() === courseName.toLowerCase().trim()
        ) || wb.SheetNames[0];

        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws);

        renderPortfolioTable(data);
    } catch (err) {
        console.error('Error loading portfolio:', err);
        document.getElementById('portfolioBody').innerHTML = '';
        document.getElementById('portfolioEmpty').style.display = 'block';
    }
    showLoading(false);
}

function renderPortfolioTable(data) {
    const tbody = document.getElementById('portfolioBody');
    const empty = document.getElementById('portfolioEmpty');

    if (!data || data.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        document.getElementById('statPortfolio').textContent = '0';
        document.getElementById('portfolioCount').textContent = '0 mahasiswa';
        return;
    }
    empty.style.display = 'none';
    document.getElementById('statPortfolio').textContent = data.length;
    document.getElementById('portfolioCount').textContent = data.length + ' mahasiswa';

    tbody.innerHTML = data.map((row, i) => {
        const nim = row['NIM'] || row['nim'] || '-';
        const nama = row['Nama'] || row['nama'] || '-';
        const linkUTS = row['link_UTS'] || row['Link_UTS'] || row['link_uts'] || '';
        const linkUAS = row['link_UAS'] || row['Link_UAS'] || row['link_uas'] || '';

        const utsLink = linkUTS
            ? `<a href="${linkUTS}" target="_blank" rel="noopener" class="link-btn">📁 Lihat UTS</a>`
            : '<span style="color:var(--text-muted)">—</span>';
        const uasLink = linkUAS
            ? `<a href="${linkUAS}" target="_blank" rel="noopener" class="link-btn">📁 Lihat UAS</a>`
            : '<span style="color:var(--text-muted)">—</span>';

        return `<tr>
            <td>${i + 1}</td>
            <td>${nim}</td>
            <td>${nama}</td>
            <td>${utsLink}</td>
            <td>${uasLink}</td>
        </tr>`;
    }).join('');
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
    loadStudentData();
});
