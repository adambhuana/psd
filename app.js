/* ===== STATE ===== */
let allStudents = [];
let filteredStudents = [];
let currentPage = 'dashboard';
let portfolioLookup = {}; // NIM -> [{ semester, semName, course, link_UTS, link_UAS }]
let lastDataHash = '';     // Track data changes for auto-refresh
let autoRefreshTimer = null;
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

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
    // Cache-busting: append timestamp so browser always fetches the latest file
    const cacheBuster = '?t=' + Date.now();
    const resp = await fetch(filename + cacheBuster, { cache: 'no-store' });
    const ab = await resp.arrayBuffer();
    return XLSX.read(ab, { type: 'array' });
}

async function loadStudentData(silent = false) {
    if (!silent) showLoading(true);
    try {
        // Load portfolio lookup first so it's ready when table renders
        await loadPortfolioLookup();

        // Load magang data from data_magang.xlsx (filtered for Data Science only)
        const magangLookup = await loadMagangLookup();

        // Load IPK data from ipk_terakhir.xlsx
        const ipkLookup = await loadIPKLookup();

        const wb = await fetchExcel('data_mahasiswa.xlsx');
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws);

        allStudents = raw.map(row => {
            const nim = String(row['NIM'] || row['nim'] || '').trim();
            const nama = row['Nama'] || row['nama'] || '';
            const kelasRaw = row['Kelas Perkuliahan'] || row['Kelas'] || row['kelas'] || '';
            const kelas = extractKelasType(kelasRaw);
            const angkatan = deriveAngkatan(nim);
            const semester = extractSemesterFromKelas(kelasRaw);

            // Match magang by student name (case-insensitive)
            const namaUpper = nama.trim().toUpperCase();
            const dataMagang = magangLookup[namaUpper] || 0;

            // Match IPK by NIM
            const ipkTerakhir = ipkLookup[nim] || 0;

            return { nim, nama, kelas, kelasRaw, angkatan, semester, dataMagang, ipkTerakhir };
        });

        populateFilters();
        applyFilters();
        updateStats();
        updateLastRefreshTime();
    } catch (err) {
        console.error('Error loading student data:', err);
    }
    if (!silent) showLoading(false);
}

/* ===== LOAD MAGANG DATA ===== */
async function loadMagangLookup() {
    const lookup = {}; // name (uppercase) -> count
    try {
        const wb = await fetchExcel('data_magang.xlsx');
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        // Filter for Data Science / Sains Data major only
        data.forEach(row => {
            const major = (row['Major '] || row['Major'] || row['major'] || '').trim().toLowerCase();
            if (major.includes('data science') || major.includes('sains data')) {
                const name = (row['Student Name '] || row['Student Name'] || row['Nama'] || '').trim().toUpperCase();
                if (name) {
                    lookup[name] = (lookup[name] || 0) + 1;
                }
            }
        });
        console.log('Magang lookup built:', Object.keys(lookup).length, 'students (Data Science only)');
    } catch (err) {
        console.warn('Could not load data_magang.xlsx:', err);
    }
    return lookup;
}

/* ===== LOAD IPK DATA ===== */
async function loadIPKLookup() {
    const lookup = {}; // NIM -> IPK
    try {
        const wb = await fetchExcel('ipk_terakhir.xlsx');
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        data.forEach(row => {
            const nim = String(row['NIM'] || row['nim'] || '').trim();
            const ipk = parseFloat(row['IPK'] || row['ipk'] || row['ipk_terakhir'] || 0) || 0;
            if (nim) {
                lookup[nim] = ipk;
            }
        });
        console.log('IPK lookup built:', Object.keys(lookup).length, 'students');
    } catch (err) {
        console.warn('Could not load ipk_terakhir.xlsx:', err);
    }
    return lookup;
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
let selectedKelas = new Set(); // Track selected kelas for multi-select

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
    populateKelasChecklist([...kelasSet].sort());
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

/* ===== KELAS MULTI-SELECT CHECKLIST ===== */
function populateKelasChecklist(values) {
    const container = document.getElementById('kelasItems');
    // If no selections yet, select all by default
    if (selectedKelas.size === 0) {
        values.forEach(v => selectedKelas.add(v));
    }
    container.innerHTML = values.map(v => {
        const checked = selectedKelas.has(v) ? 'checked' : '';
        const count = allStudents.filter(s => s.kelas === v).length;
        return `<label class="checklist-item">
            <input type="checkbox" value="${v}" ${checked} onchange="onKelasCheck()">
            <span class="checklist-check"></span>
            <span class="checklist-text">${v}</span>
            <span class="checklist-count">${count}</span>
        </label>`;
    }).join('');
    updateKelasLabel();
}

function onKelasCheck() {
    const checks = document.querySelectorAll('#kelasItems input[type=checkbox]');
    selectedKelas.clear();
    checks.forEach(cb => {
        if (cb.checked) selectedKelas.add(cb.value);
    });
    updateKelasLabel();
    applyFilters();
}

function selectAllKelas(selectAll) {
    const checks = document.querySelectorAll('#kelasItems input[type=checkbox]');
    selectedKelas.clear();
    checks.forEach(cb => {
        cb.checked = selectAll;
        if (selectAll) selectedKelas.add(cb.value);
    });
    updateKelasLabel();
    applyFilters();
}

function updateKelasLabel() {
    const label = document.getElementById('kelasLabel');
    const totalOptions = document.querySelectorAll('#kelasItems input[type=checkbox]').length;
    if (selectedKelas.size === 0) {
        label.textContent = 'Tidak ada kelas';
        label.className = 'checklist-label checklist-label-empty';
    } else if (selectedKelas.size === totalOptions) {
        label.textContent = 'Semua Kelas';
        label.className = 'checklist-label';
    } else {
        const names = [...selectedKelas];
        if (names.length <= 2) {
            label.textContent = names.join(', ');
        } else {
            label.textContent = names.slice(0, 2).join(', ') + ` +${names.length - 2} lagi`;
        }
        label.className = 'checklist-label checklist-label-active';
    }
}

function toggleKelasDropdown() {
    const dropdown = document.getElementById('kelasDropdown');
    dropdown.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('kelasDropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

function matchIPKRange(ipk, range) {
    if (!range) return true;
    const ranges = {
        '0-2':     [0, 2.0],
        '2.1-2.5': [2.1, 2.5],
        '2.6-3':   [2.6, 3.0],
        '3.1-3.5': [3.1, 3.5],
        '3.6-4':   [3.6, 4.0]
    };
    const [min, max] = ranges[range] || [0, 4];
    return ipk >= min && ipk <= max;
}

function matchMagang(count, filter) {
    if (!filter) return true;
    if (filter === '>3') return count > 3;
    return count === parseInt(filter);
}

function applyFilters() {
    const angkatan = document.getElementById('filterAngkatan').value;
    const semester = document.getElementById('filterSemester').value;
    const magang = document.getElementById('filterMagang').value;
    const ipkRange = document.getElementById('filterIPK').value;
    const search = document.getElementById('filterSearch').value.toLowerCase().trim();
    const totalKelasOptions = document.querySelectorAll('#kelasItems input[type=checkbox]').length;
    const allKelasSelected = selectedKelas.size === totalKelasOptions || selectedKelas.size === 0;

    filteredStudents = allStudents.filter(s => {
        if (angkatan && String(s.angkatan) !== angkatan) return false;
        if (semester && String(s.semester) !== semester) return false;
        if (!allKelasSelected && !selectedKelas.has(s.kelas)) return false;
        if (!matchMagang(s.dataMagang, magang)) return false;
        if (!matchIPKRange(s.ipkTerakhir, ipkRange)) return false;
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
    document.getElementById('filterMagang').value = '';
    document.getElementById('filterIPK').value = '';
    document.getElementById('filterSearch').value = '';
    // Reset kelas: select all
    selectAllKelas(true);
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

        // IPK color coding
        const ipkVal = s.ipkTerakhir;
        let ipkClass = 'ipk-low';
        if (ipkVal >= 3.6) ipkClass = 'ipk-excellent';
        else if (ipkVal >= 3.1) ipkClass = 'ipk-good';
        else if (ipkVal >= 2.6) ipkClass = 'ipk-average';
        else if (ipkVal >= 2.1) ipkClass = 'ipk-below';

        // Magang badge
        const magangBadge = s.dataMagang > 0
            ? `<span class="magang-badge">${s.dataMagang}×</span>`
            : `<span class="magang-zero">0</span>`;

        return `<tr class="${hasPortfolio ? 'has-portfolio' : ''}">
            <td>${i + 1}</td>
            <td>${s.nim}</td>
            <td>${s.nama}</td>
            <td>${s.angkatan || '-'}</td>
            <td>${s.semester || '-'}</td>
            <td>${s.kelas || '-'}</td>
            <td><span class="ipk-badge ${ipkClass}">${ipkVal.toFixed(2)}</span></td>
            <td>${magangBadge}</td>
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

/* ===== AUTO-REFRESH & DATA CHANGE DETECTION ===== */
function computeDataHash(portfolioLookup) {
    // Simple hash based on total entries and a sample of content
    const keys = Object.keys(portfolioLookup).sort();
    const totalEntries = keys.reduce((sum, k) => sum + portfolioLookup[k].length, 0);
    const sampleData = keys.slice(0, 5).map(k => {
        return k + ':' + portfolioLookup[k].map(e => e.link_UTS + e.link_UAS).join(',');
    }).join('|');
    return `${keys.length}-${totalEntries}-${sampleData.length}-${hashString(sampleData)}`;
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

function updateLastRefreshTime() {
    const el = document.getElementById('lastRefreshTime');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    const indicator = document.getElementById('refreshIndicator');
    if (indicator) {
        indicator.classList.add('pulse');
        setTimeout(() => indicator.classList.remove('pulse'), 1000);
    }
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    const existing = document.querySelector('.data-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `data-toast data-toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

async function silentRefresh() {
    try {
        await loadStudentData(true);
        const newHash = computeDataHash(portfolioLookup);
        if (lastDataHash && newHash !== lastDataHash) {
            showToast('Data portfolio berhasil diperbarui!', 'success');
            console.log('Data changed, UI updated automatically.');
        }
        lastDataHash = newHash;
    } catch (err) {
        console.warn('Silent refresh failed:', err);
    }
}

function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(silentRefresh, AUTO_REFRESH_INTERVAL);
    console.log(`Auto-refresh started (every ${AUTO_REFRESH_INTERVAL / 1000}s)`);
}

function stopAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
    }
}

async function manualRefresh() {
    const btn = document.getElementById('refreshBtn');
    if (btn) {
        btn.classList.add('spinning');
        btn.disabled = true;
    }
    showToast('Memuat ulang data...', 'info');
    try {
        await loadStudentData(false);
        const newHash = computeDataHash(portfolioLookup);
        if (lastDataHash && newHash !== lastDataHash) {
            showToast('Data berhasil diperbarui dengan perubahan baru!', 'success');
        } else {
            showToast('Data sudah yang terbaru.', 'info');
        }
        lastDataHash = newHash;
    } catch (err) {
        showToast('Gagal memuat data. Coba lagi.', 'warning');
    }
    if (btn) {
        btn.classList.remove('spinning');
        btn.disabled = false;
    }
}

// Pause auto-refresh when tab is not visible (save resources)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        silentRefresh(); // Refresh immediately when tab becomes visible
        startAutoRefresh();
    }
});

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', async () => {
    await loadStudentData();
    lastDataHash = computeDataHash(portfolioLookup);
    startAutoRefresh();
});
