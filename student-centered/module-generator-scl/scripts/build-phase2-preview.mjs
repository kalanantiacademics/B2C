import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = '/private/tmp/kalananti-scl-phase2-preview';
const read = (file) => fs.readFileSync(path.join(ROOT, 'src', file), 'utf8');
const methods = [
  'getAppBootstrap',
  'authenticateEditor',
  'resumeEditorSession',
  'logoutEditor',
  'listCoursesAndLevels',
  'listActivity',
  'recordComposeAttempt',
  'listPublishedModules',
  'getDrivePublishingCapability',
  'loadLevelProject',
  'acquireSessionLease',
  'resumeSessionLease',
  'heartbeatSessionLease',
  'releaseSessionLease',
  'saveSessionPatch',
  'getSessionHistory',
  'restoreSessionRevision'
];

const serverStub = `<script>
  (function () {
    function createRunner(successHandler, failureHandler) {
      var runner = {
        withSuccessHandler: function (handler) { return createRunner(handler, failureHandler); },
        withFailureHandler: function (handler) { return createRunner(successHandler, handler); }
      };
      ${methods.map((method) => `runner.${method} = function () {
        var args = Array.prototype.slice.call(arguments);
        var failures = window.__phase2RpcFailures || {};
        if (failures['${method}']) {
          setTimeout(function () { failureHandler(new Error('Synthetic connection failure')); }, 0);
          return;
        }
        window.__phase2Rpc('${method}', args).then(function (result) {
          var delays = window.__phase2RpcDelays || {};
          setTimeout(function () { successHandler(result); }, Number(delays['${method}']) || 0);
        }).catch(failureHandler);
      };`).join('\n      ')}
      return runner;
    }
    window.google = { script: { run: createRunner(function () {}, function () {}) } };
  })();
</script>`;

let html = read('index.html');
html = html.replace("<?!= include_('Assets'); ?>", () => read('Assets.html'));
html = html.replace("<?!= include_('FontAssets'); ?>", () => read('FontAssets.html'));
html = html.replace("<?!= include_('Styles'); ?>", () => read('Styles.html'));
html = html.replace("<?!= include_('PageAssets'); ?>", () => read('PageAssets.html'));
html = html.replace("<?!= include_('LegacyAdapter'); ?>", () => read('LegacyAdapter.html'));
html = html.replace("<?!= include_('Editor'); ?>", () => read('Editor.html'));
html = html.replace("<?!= include_('Publisher'); ?>", () => read('Publisher.html'));
html = html.replace("<?!= include_('App'); ?>", () => serverStub + read('App.html'));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
console.log(OUTPUT_DIR);
