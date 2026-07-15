const fs = require('fs');
const file = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/teacher-dashboard/class-detail.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Update fetchRubrics to use WEB_APP_URL
const newFetchRubricsCode = `
// ── Rubric Data ─────────────────────────────────────────────────────────────
window.rubricData = null;
async function fetchRubrics() {
    if (window.rubricData) return;
    try {
        const res = await fetch(\`\${WEB_APP_URL}?action=getRubrics\`);
        const json = await res.json();
        if(json.success) {
            window.rubricData = json.rubrics;
            console.log('[Rubrics] Loaded:', window.rubricData.length);
        } else {
            console.error('[Rubrics] Server error:', json.message);
        }
    } catch(e) {
        console.error('[Rubrics] Failed to load:', e);
    }
}
// Call fetch rubrics early
fetchRubrics();
`;
content = content.replace(/\/\/ ── Rubric Data ──+[\s\S]*?\/\/ Call fetch rubrics early\nfetchRubrics\(\);\n/, newFetchRubricsCode);


// 2. Add Rubric Modal HTML to the end of body (before scripts or near other modals)
const rubricModalHTML = `
<!-- Rubric Modal -->
<div id="rubric-modal" class="fixed inset-0 z-[60] hidden flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-[#06101f]/90 backdrop-blur-sm transition-opacity" onclick="closeRubricModal()"></div>
    
    <!-- Modal Content -->
    <div id="rubric-modal-container" class="relative bg-[#0F172A] w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-white/10 transition-all transform scale-95 overflow-hidden">
        
        <!-- Header -->
        <div class="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-[#1E293B]">
            <div>
                <h3 class="text-lg font-black text-white flex items-center gap-2">
                    <span class="bg-[#F9C013] text-[#06101f] p-1.5 rounded-lg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></span>
                    Teacher Observation Rubric
                </h3>
                <p id="rubric-modal-subtitle" class="text-xs text-[#F9C013] font-bold uppercase tracking-widest mt-1">GUIDE FOR SESSION X</p>
            </div>
            <button onclick="closeRubricModal()" class="text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        
        <!-- Body (Table) -->
        <div class="p-0 overflow-y-auto flex-1">
            <table class="w-full text-left border-collapse text-sm">
                <thead class="bg-[#0F172A] text-white/50 text-[10px] uppercase font-bold tracking-widest sticky top-0 shadow-sm">
                    <tr>
                        <th class="py-4 px-6 border-b border-white/10 text-center w-20">Score</th>
                        <th class="py-4 px-6 border-b border-white/10 w-1/2">Activity Observation</th>
                        <th class="py-4 px-6 border-b border-white/10 w-1/2">Learning Engagement</th>
                    </tr>
                </thead>
                <tbody id="rubric-table-body" class="divide-y divide-white/5 text-white/80">
                    <!-- Injected via JS -->
                </tbody>
            </table>
        </div>
        
        <!-- Footer (Notes) -->
        <div class="p-6 bg-[#1E293B] border-t border-white/10">
            <div class="mb-4">
                <label class="block text-xs font-bold text-red-400 mb-2 flex items-center gap-2"><span>⚠️</span> Catatan Khusus untuk Report Orang Tua</label>
                <textarea id="rubric-modal-notes" rows="2" class="w-full bg-[#0F172A] border border-red-500/30 rounded-xl p-3 text-sm text-white focus:border-red-400 focus:outline-none transition-colors" placeholder="Tuliskan perkembangan, kekuatan, dan hal yang perlu ditingkatkan..."></textarea>
            </div>
            <div class="flex gap-3 justify-end">
                <button onclick="closeRubricModal()" class="px-5 py-2.5 rounded-xl font-bold text-white/70 hover:bg-white/10 transition-colors border border-transparent hover:border-white/20 cursor-pointer">Batal</button>
                <button onclick="saveRubricModal()" class="px-6 py-2.5 rounded-xl font-black bg-[#F9C013] text-[#06101f] hover:bg-yellow-400 hover:shadow-[0_0_15px_rgba(249,192,19,0.4)] transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2">
                    Simpan Penilaian
                </button>
            </div>
        </div>
    </div>
</div>
`;
content = content.replace('</body>', rubricModalHTML + '\n</body>');


// 3. Update the Rubric Container inside Approval Modal to just have a launch button
const oldRubricContRegex = /<div id="appr-rubric-container"[^>]*>[\s\S]*?<!-- Injected by JS -->\s*<\/div>/;
const newApprRubricContainer = `
                <!-- Dynamic Rubric Container (Session 4 & 8) -->
                <div id="appr-rubric-container" class="hidden phase-group mt-4 bg-[#0F172A] rounded-2xl border border-[#F9C013]/30 p-5 text-center">
                    <h4 class="text-sm font-black text-white mb-2">Penilaian Observasi (Sesi <span id="appr-rubric-sess-num">X</span>)</h4>
                    <p class="text-xs text-white/60 mb-4">Silahkan gunakan Pop-Up Rubrik Panduan untuk menilai indikator aktivitas dan engagement siswa.</p>
                    
                    <button type="button" onclick="openRubricModal()" class="px-5 py-3 rounded-xl font-black bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-all cursor-pointer inline-flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Buka Rubrik & Nilai
                    </button>
                    
                    <!-- Hidden inputs to store values -->
                    <input type="hidden" id="hidden-obs-aktivitas" value="">
                    <input type="hidden" id="hidden-obs-engagement" value="">
                    <input type="hidden" id="hidden-obs-notes" value="">
                    
                    <div id="rubric-status-badge" class="mt-4 hidden items-center justify-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
                        ✅ Nilai Rubrik Tersimpan Sementara
                    </div>
                </div>
`;
content = content.replace(oldRubricContRegex, newApprRubricContainer);


// 4. Modify openApprovalModal logic to simplify the rubric container logic
const oldOpenApprLogicRegex = /\/\/ Dynamic Rubrics for Sesi 4 & 8[\s\S]*?rubricCont\.classList\.add\('hidden'\);\n    \}/;
const newOpenApprLogic = `
    // Dynamic Rubrics for Sesi 4 & 8
    const rubricCont = document.getElementById('appr-rubric-container');
    if (rubricCont) {
        if (sNum === 4 || sNum === 8) {
            rubricCont.classList.remove('hidden');
            document.getElementById('appr-rubric-sess-num').textContent = sNum;
            
            // Prefill hidden inputs if data exists
            document.getElementById('hidden-obs-notes').value = sessInfo.observation || '';
            // Reset status badge
            document.getElementById('rubric-status-badge').classList.add('hidden');
            
            // Pre-fetch in background
            if (!window.rubricData) fetchRubrics();
        } else {
            rubricCont.classList.add('hidden');
        }
    }
`;
content = content.replace(oldOpenApprLogicRegex, newOpenApprLogic);


// 5. Add JS functions for Rubric Modal
const rubricModalJS = `
// ── Rubric Modal Functions ──────────────────────────────────────────────────
let selectedAktivitas = 0;
let selectedEngagement = 0;

async function openRubricModal() {
    const sNum = currentApprSession;
    document.getElementById('rubric-modal-subtitle').textContent = \`GUIDE FOR SESSION \${sNum}\`;
    
    // Show modal loading
    document.getElementById('rubric-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('rubric-modal-container').classList.remove('scale-95');
    }, 10);
    
    const tbody = document.getElementById('rubric-table-body');
    tbody.innerHTML = \`<tr><td colspan="3" class="text-center py-10"><span class="animate-spin inline-block">🔄</span> Memuat data rubrik...</td></tr>\`;
    
    if (!window.rubricData) await fetchRubrics();
    
    const s = students[currentApprIndex];
    const targetPertemuan = sNum === 4 ? 'Pertemuan 1-4' : 'Pertemuan 5-8';
    let rData = [];
    
    if (window.rubricData) {
        // More robust search
        rData = window.rubricData.filter(r => 
            r.program.toLowerCase().includes(CLASS_PROG.toLowerCase()) && 
            r.level.toLowerCase().includes((s.level || '').toLowerCase()) &&
            r.pertemuan.toLowerCase().includes(targetPertemuan.toLowerCase())
        );
        // Fallback: If no level match, just match program and pertemuan
        if (rData.length === 0) {
            rData = window.rubricData.filter(r => 
                r.program.toLowerCase().includes(CLASS_PROG.toLowerCase()) && 
                r.pertemuan.toLowerCase().includes(targetPertemuan.toLowerCase())
            );
        }
    }
    
    // Set initial values from hidden inputs
    selectedAktivitas = parseInt(document.getElementById('hidden-obs-aktivitas').value) || 0;
    selectedEngagement = parseInt(document.getElementById('hidden-obs-engagement').value) || 0;
    document.getElementById('rubric-modal-notes').value = document.getElementById('hidden-obs-notes').value || '';
    
    if (rData.length === 0) {
        tbody.innerHTML = \`
            <tr>
                <td colspan="3" class="p-6 text-center text-red-400">
                    <p class="mb-4">Data rubrik untuk program "\${CLASS_PROG}" tidak ditemukan di database.</p>
                    <div class="flex gap-4 justify-center">
                        <div class="w-48 text-left">
                            <label class="text-xs mb-1 block">Manual Aktivitas (1-5)</label>
                            <input type="number" id="manual-akt" min="1" max="5" value="\${selectedAktivitas || ''}" class="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white">
                        </div>
                        <div class="w-48 text-left">
                            <label class="text-xs mb-1 block">Manual Engagement (1-5)</label>
                            <input type="number" id="manual-eng" min="1" max="5" value="\${selectedEngagement || ''}" class="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white">
                        </div>
                    </div>
                </td>
            </tr>
        \`;
    } else {
        // Sort by nilai 1 to 5
        rData.sort((a, b) => a.nilai - b.nilai);
        
        tbody.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const rowData = rData.find(r => r.nilai === i) || { obsAktivitas: '-', obsEngagement: '-' };
            
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-white/[0.02] transition-colors group';
            
            const isAktSelected = selectedAktivitas === i;
            const isEngSelected = selectedEngagement === i;
            
            tr.innerHTML = \`
                <td class="py-4 px-6 border-b border-white/5 text-center font-black text-lg text-[#F9C013]">\${i}</td>
                <td class="py-4 px-6 border-b border-white/5 cursor-pointer transition-all \${isAktSelected ? 'bg-white/10 border-l-4 border-l-[#F9C013]' : ''}" onclick="selectRubric('akt', \${i}, this)">
                    <div class="flex items-start gap-3">
                        <div class="mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors \${isAktSelected ? 'border-[#F9C013] bg-[#F9C013]' : 'border-white/20 group-hover:border-white/40'}">
                            \${isAktSelected ? '<div class="w-2 h-2 bg-[#06101f] rounded-full"></div>' : ''}
                        </div>
                        <span class="\${isAktSelected ? 'text-white' : 'text-white/70'} leading-relaxed">\${rowData.obsAktivitas}</span>
                    </div>
                </td>
                <td class="py-4 px-6 border-b border-white/5 cursor-pointer transition-all \${isEngSelected ? 'bg-white/10 border-l-4 border-l-[#F9C013]' : ''}" onclick="selectRubric('eng', \${i}, this)">
                    <div class="flex items-start gap-3">
                        <div class="mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors \${isEngSelected ? 'border-[#F9C013] bg-[#F9C013]' : 'border-white/20 group-hover:border-white/40'}">
                            \${isEngSelected ? '<div class="w-2 h-2 bg-[#06101f] rounded-full"></div>' : ''}
                        </div>
                        <span class="\${isEngSelected ? 'text-white' : 'text-white/70'} leading-relaxed">\${rowData.obsEngagement}</span>
                    </div>
                </td>
            \`;
            tbody.appendChild(tr);
        }
    }
}

function selectRubric(type, val, tdEl) {
    if (type === 'akt') {
        selectedAktivitas = val;
    } else {
        selectedEngagement = val;
    }
    
    // Re-render rows efficiently
    const tbody = document.getElementById('rubric-table-body');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach((tr, idx) => {
        const i = idx + 1; // row 1 to 5
        const tds = tr.querySelectorAll('td');
        if (tds.length < 3) return;
        
        // Akt cell
        const isAktSelected = selectedAktivitas === i;
        tds[1].className = \`py-4 px-6 border-b border-white/5 cursor-pointer transition-all \${isAktSelected ? 'bg-white/10 border-l-4 border-l-[#F9C013]' : ''}\`;
        tds[1].querySelector('.w-4.h-4').className = \`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors \${isAktSelected ? 'border-[#F9C013] bg-[#F9C013]' : 'border-white/20 group-hover:border-white/40'}\`;
        tds[1].querySelector('.w-4.h-4').innerHTML = isAktSelected ? '<div class="w-2 h-2 bg-[#06101f] rounded-full"></div>' : '';
        tds[1].querySelector('span').className = isAktSelected ? 'text-white leading-relaxed' : 'text-white/70 leading-relaxed';
        
        // Eng cell
        const isEngSelected = selectedEngagement === i;
        tds[2].className = \`py-4 px-6 border-b border-white/5 cursor-pointer transition-all \${isEngSelected ? 'bg-white/10 border-l-4 border-l-[#F9C013]' : ''}\`;
        tds[2].querySelector('.w-4.h-4').className = \`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors \${isEngSelected ? 'border-[#F9C013] bg-[#F9C013]' : 'border-white/20 group-hover:border-white/40'}\`;
        tds[2].querySelector('.w-4.h-4').innerHTML = isEngSelected ? '<div class="w-2 h-2 bg-[#06101f] rounded-full"></div>' : '';
        tds[2].querySelector('span').className = isEngSelected ? 'text-white leading-relaxed' : 'text-white/70 leading-relaxed';
    });
}

function closeRubricModal() {
    document.getElementById('rubric-modal-container').classList.add('scale-95');
    setTimeout(() => {
        document.getElementById('rubric-modal').classList.add('hidden');
    }, 200);
}

function saveRubricModal() {
    // Check fallback inputs if exist
    const manAkt = document.getElementById('manual-akt');
    const manEng = document.getElementById('manual-eng');
    if (manAkt) selectedAktivitas = manAkt.value;
    if (manEng) selectedEngagement = manEng.value;
    
    // Save to hidden fields
    document.getElementById('hidden-obs-aktivitas').value = selectedAktivitas;
    document.getElementById('hidden-obs-engagement').value = selectedEngagement;
    document.getElementById('hidden-obs-notes').value = document.getElementById('rubric-modal-notes').value;
    
    // Show success badge in approval modal
    document.getElementById('rubric-status-badge').classList.remove('hidden');
    
    closeRubricModal();
}
`;
content = content.replace('// ── Initialize ──────────────────────────────────────────────────────────────', rubricModalJS + '\n\n// ── Initialize ──────────────────────────────────────────────────────────────');


// 6. Fix the Payload logic in submitApproval
const oldPayloadLogicRegex = /obsAktivitasScore:[^,]*,[\s\n]*obsEngagementScore:[^,]*,[\s\n]*obsNotes:[^,]*/;
const newPayloadLogic = `obsAktivitasScore: (currentApprSession === 4 || currentApprSession === 8) ? document.getElementById('hidden-obs-aktivitas').value : '',
            obsEngagementScore: (currentApprSession === 4 || currentApprSession === 8) ? document.getElementById('hidden-obs-engagement').value : '',
            obsNotes: (currentApprSession === 4 || currentApprSession === 8) ? document.getElementById('hidden-obs-notes').value : ''`;
content = content.replace(oldPayloadLogicRegex, newPayloadLogic);

fs.writeFileSync(file, content);
console.log('class-detail.html patched with new popup logic.');
