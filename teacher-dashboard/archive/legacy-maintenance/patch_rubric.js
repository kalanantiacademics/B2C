const fs = require('fs');
const file = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/teacher-dashboard/class-detail.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Add global variables and fetchRubrics function
const fetchRubricsCode = `
// ── Rubric Data ─────────────────────────────────────────────────────────────
window.rubricData = null;
async function fetchRubrics() {
    if (window.rubricData) return;
    try {
        const url = 'https://docs.google.com/spreadsheets/d/1RutBjQo881tjyArM5TZFYs_1pWFySuNq7Fj_zj38bfU/gviz/tq?tqx=out:json&sheet=[4S]%20Mapping%20Indikator';
        const res = await fetch(url);
        const text = await res.text();
        const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonStr);
        
        window.rubricData = data.table.rows.map(row => {
            const c = row.c;
            return {
                program: c[0] ? c[0].v : '',
                level: c[1] ? c[1].v : '',
                pertemuan: c[2] ? c[2].v : '',
                nilai: c[4] ? parseInt(c[4].v) : 0,
                obsAktivitas: c[6] ? c[6].v : '',
                obsEngagement: c[7] ? c[7].v : ''
            };
        }).filter(r => r.program); // Filter empty rows
        console.log('[Rubrics] Loaded:', window.rubricData.length);
    } catch(e) {
        console.error('[Rubrics] Failed to load:', e);
    }
}
// Call fetch rubrics early
fetchRubrics();
`;

// Insert after variables init (around line 607)
content = content.replace("document.getElementById('nav-class-prog').textContent = CLASS_PROG;", "document.getElementById('nav-class-prog').textContent = CLASS_PROG;\n" + fetchRubricsCode);

// 2. Replace Observation Group in HTML with a new Rubric Container
const oldObsGroup = `                <!-- Session 4 Observation -->
                <div id="appr-observation-group" class="hidden phase-group mt-4">
                    <h4 class="text-xs font-black uppercase tracking-widest text-[#F9C013] mb-3">Penilaian Hasil Observasi (Sesi 4)</h4>
                    <textarea id="appr-observation-text" rows="3" class="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white" placeholder="Masukkan hasil observasi di sini..."></textarea>
                </div>`;

const newRubricContainer = `                <!-- Dynamic Rubric Container (Session 4 & 8) -->
                <div id="appr-rubric-container" class="hidden phase-group mt-4">
                    <!-- Injected by JS -->
                </div>`;
content = content.replace(oldObsGroup, newRubricContainer);

// 3. Update openModalUpdate logic
const oldOpenModalLogic = `
    // Toggle Sesi 4 & 12 specifics
    const obsGroup = document.getElementById('appr-observation-group');
    const confGroup = document.getElementById('appr-confirmation-group');
    if (obsGroup) {
        if (sNum === 4) {
            obsGroup.classList.remove('hidden');
            document.getElementById('appr-observation-text').value = sessInfo.observation || '';
        } else {
            obsGroup.classList.add('hidden');
        }
    }
    if (confGroup) {
        if (sNum === 12) {
            confGroup.classList.remove('hidden');
            document.getElementById('appr-project-collected').checked = sessInfo.projectCollected || false;
        } else {
            confGroup.classList.add('hidden');
        }
    }
`;

const newOpenModalLogic = `
    // Sesi 12 specific
    const confGroup = document.getElementById('appr-confirmation-group');
    if (confGroup) {
        if (sNum === 12) {
            confGroup.classList.remove('hidden');
            document.getElementById('appr-project-collected').checked = sessInfo.projectCollected || false;
        } else {
            confGroup.classList.add('hidden');
        }
    }

    // Dynamic Rubrics for Sesi 4 & 8
    const rubricCont = document.getElementById('appr-rubric-container');
    if (rubricCont) {
        if (sNum === 4 || sNum === 8) {
            rubricCont.classList.remove('hidden');
            rubricCont.innerHTML = \`<div class="text-center py-4"><span class="animate-spin inline-block text-white">🔄</span> Memuat rubrik...</div>\`;
            
            // Ensure rubrics are loaded
            if (!window.rubricData) await fetchRubrics();
            
            const targetPertemuan = sNum === 4 ? 'Pertemuan 1-4' : 'Pertemuan 5-8';
            let rData = [];
            if (window.rubricData) {
                // Match program and level. Handle cases where CLASS_PROG might have slight differences
                rData = window.rubricData.filter(r => 
                    r.program.toLowerCase().includes(CLASS_PROG.toLowerCase()) && 
                    r.level.toLowerCase().includes((s.level || '').toLowerCase()) &&
                    r.pertemuan.toLowerCase().includes(targetPertemuan.toLowerCase())
                );
            }
            
            if (rData.length === 0) {
                // Fallback UI
                rubricCont.innerHTML = \`
                    <h4 class="text-xs font-black uppercase tracking-widest text-[#F9C013] mb-3">Penilaian Observasi (Sesi \${sNum})</h4>
                    <p class="text-xs text-red-400 mb-2">Peringatan: Data rubrik untuk program ini tidak ditemukan. Silahkan isi manual.</p>
                    <input type="number" id="rubric-aktivitas-val" min="1" max="5" placeholder="Nilai Aktivitas (1-5)" class="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white mb-2">
                    <input type="number" id="rubric-engagement-val" min="1" max="5" placeholder="Nilai Engagement (1-5)" class="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white mb-2">
                    <textarea id="rubric-notes" rows="3" class="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white" placeholder="Catatan untuk Orang Tua (Mohon berhati-hati, ini akan tampil di report)"></textarea>
                \`;
            } else {
                // Build robust UI
                const buildRadio = (type, title) => {
                    let html = \`<div class="mb-4 bg-white/5 rounded-2xl p-4 border border-white/10">
                        <h5 class="text-sm font-bold text-white mb-3">\${title}</h5>
                        <div class="flex gap-2 mb-3">\`;
                    for(let i=1; i<=5; i++) {
                        html += \`
                        <label class="flex-1 cursor-pointer">
                            <input type="radio" name="rubric-\${type}" value="\${i}" class="peer sr-only" \${i===5?'checked':''} onchange="updateRubricDesc('\${type}', \${i})">
                            <div class="text-center py-2 rounded-xl border border-white/20 text-white peer-checked:bg-[#F9C013] peer-checked:border-[#F9C013] peer-checked:text-[#06101f] peer-checked:font-black transition-all">\${i}</div>
                        </label>\`;
                    }
                    html += \`</div>
                        <p id="rubric-desc-\${type}" class="text-xs text-[#8AADD8] bg-[#06101f]/50 p-3 rounded-xl border border-[#8AADD8]/20 italic"></p>
                    </div>\`;
                    return html;
                };

                rubricCont.innerHTML = \`
                    <h4 class="text-xs font-black uppercase tracking-widest text-[#F9C013] mb-3">Penilaian Berbasis Rubrik (Sesi \${sNum})</h4>
                    \${buildRadio('aktivitas', 'Observasi Aktivitas')}
                    \${buildRadio('engagement', 'Observasi Learning Engagement')}
                    <div class="mb-4 bg-red-500/10 rounded-2xl p-4 border border-red-500/30">
                        <h5 class="text-sm font-bold text-red-300 mb-2 flex items-center gap-2"><span>⚠️</span> Catatan Khusus</h5>
                        <p class="text-xs text-red-200/70 mb-3 leading-relaxed">Harap isi dengan hati-hati. Catatan ini akan langsung masuk ke report yang dibaca oleh orang tua siswa.</p>
                        <textarea id="rubric-notes" rows="3" class="w-full bg-[#06101f]/50 border border-red-500/20 rounded-xl p-3 text-sm text-white focus:border-red-400 focus:outline-none transition-colors" placeholder="Tuliskan perkembangan, kekuatan, dan hal yang perlu ditingkatkan..."></textarea>
                    </div>
                \`;

                // Add helper function to global scope if not exists
                if(!window.updateRubricDesc) {
                    window.updateRubricDesc = (type, val) => {
                        const targetData = window.currentRubricData.find(r => r.nilai === val);
                        if(targetData) {
                            const desc = type === 'aktivitas' ? targetData.obsAktivitas : targetData.obsEngagement;
                            document.getElementById(\`rubric-desc-\${type}\`).textContent = \`"\${desc}"\`;
                        }
                    };
                }
                window.currentRubricData = rData;
                window.updateRubricDesc('aktivitas', 5);
                window.updateRubricDesc('engagement', 5);
                
                // Prefill notes if available
                document.getElementById('rubric-notes').value = sessInfo.observation || '';
            }
        } else {
            rubricCont.classList.add('hidden');
        }
    }
`;
content = content.replace(oldOpenModalLogic, newOpenModalLogic);


// 4. Update payload to gather the scores
const oldPayloadLogic = `
            observationResult: currentApprSession === 4 ? document.getElementById('appr-observation-text').value : '',
            projectCollected: currentApprSession === 12 ? document.getElementById('appr-project-collected').checked : false
`;

const newPayloadLogic = `
            projectCollected: currentApprSession === 12 ? document.getElementById('appr-project-collected').checked : false,
            obsAktivitasScore: (currentApprSession === 4 || currentApprSession === 8) ? (document.querySelector('input[name="rubric-aktivitas"]:checked') ? document.querySelector('input[name="rubric-aktivitas"]:checked').value : (document.getElementById('rubric-aktivitas-val')?.value || '')) : '',
            obsEngagementScore: (currentApprSession === 4 || currentApprSession === 8) ? (document.querySelector('input[name="rubric-engagement"]:checked') ? document.querySelector('input[name="rubric-engagement"]:checked').value : (document.getElementById('rubric-engagement-val')?.value || '')) : '',
            obsNotes: (currentApprSession === 4 || currentApprSession === 8) ? document.getElementById('rubric-notes').value : ''
`;
content = content.replace(oldPayloadLogic, newPayloadLogic);

fs.writeFileSync(file, content);
console.log('class-detail.html rubric patch applied successfully.');
