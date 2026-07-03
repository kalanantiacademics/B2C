const fs = require('fs');
const file = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/teacher-dashboard/class-detail.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Observation Textarea in the modal
const obsHtml = `
                <!-- Session 4 Observation -->
                <div id="appr-observation-group" class="hidden phase-group mt-4">
                    <h4 class="text-xs font-black uppercase tracking-widest text-[#F9C013] mb-3">Penilaian Hasil Observasi (Sesi 4)</h4>
                    <textarea id="appr-observation-text" rows="3" class="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white" placeholder="Masukkan hasil observasi di sini..."></textarea>
                </div>

                <!-- Session 12 Confirmation -->
                <div id="appr-confirmation-group" class="hidden phase-group mt-4">
                    <h4 class="text-xs font-black uppercase tracking-widest text-[#F9C013] mb-3">Konfirmasi Project (Sesi 12)</h4>
                    <label class="flex items-center gap-3 text-sm cursor-pointer p-3 border border-white/10 rounded-xl hover:bg-white/5">
                        <input type="checkbox" id="appr-project-collected" class="w-5 h-5 rounded border-white/20 bg-transparent text-[#F9C013]">
                        <span style="color: var(--text)">Project dikumpulkan dan disimpan di sheet</span>
                    </label>
                </div>
`;

content = content.replace('<!-- Quiz Stars -->', obsHtml + '\n                <!-- Quiz Stars -->');

// 2. In openApprovalModal, toggle these groups based on session
const openModalFunc = `
    document.getElementById('appr-quiz-display').textContent = \`\${qVal} (\${qStars} / 5 ⭐)\`;
    document.getElementById('appr-quiz-stars').value = qStars;
`;
const openModalUpdate = `
    document.getElementById('appr-quiz-display').textContent = \`\${qVal} (\${qStars} / 5 ⭐)\`;
    document.getElementById('appr-quiz-stars').value = qStars;

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
content = content.replace(openModalFunc, openModalUpdate);

// 3. In submitApproval, add the new fields to the payload
const payloadObj = `
        const payload = {
            action: 'approveProject',
            studentName: s.name,
            sessionNum: currentApprSession,
            classLink: CLASS_LINK,
            mustStars: phaseRatings.must,
            shouldStars: phaseRatings.should,
            aspireStars: phaseRatings.aspire,
            quizStars: document.getElementById('appr-quiz-stars').value,
            bonusStars: bonusStarsStored // Will be summed in backend or added here
        };
`;
const newPayloadObj = `
        const payload = {
            action: 'approveProject',
            studentName: s.name,
            sessionNum: currentApprSession,
            classLink: CLASS_LINK,
            mustStars: phaseRatings.must,
            shouldStars: phaseRatings.should,
            aspireStars: phaseRatings.aspire,
            quizStars: document.getElementById('appr-quiz-stars').value,
            bonusStars: bonusStarsStored, // Will be summed in backend or added here
            observationResult: currentApprSession === 4 ? document.getElementById('appr-observation-text').value : '',
            projectCollected: currentApprSession === 12 ? document.getElementById('appr-project-collected').checked : false
        };
`;
content = content.replace(payloadObj, newPayloadObj);

fs.writeFileSync(file, content);
console.log('class-detail.html patched successfully.');
