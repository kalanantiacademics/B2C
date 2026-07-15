(() => {
    const PHONE_MAX_SHORT_SIDE = 599;

    function isPhone() {
        const ua = navigator.userAgent || '';
        const uaDataMobile = navigator.userAgentData?.mobile === true;
        const phoneUA = /iPhone|iPod|Windows Phone|Android.+Mobile|BlackBerry|BB10|Opera Mini|IEMobile/i.test(ua);
        const tabletUA = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
        const iPadDesktopUA = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
        const shortSide = Math.min(screen.width || innerWidth, screen.height || innerHeight);
        const coarsePhoneScreen = matchMedia('(pointer: coarse)').matches && shortSide <= PHONE_MAX_SHORT_SIDE;

        if (tabletUA || iPadDesktopUA) return false;
        return uaDataMobile || phoneUA || coarsePhoneScreen;
    }

    function applyDeviceAccess() {
        const blocked = isPhone();
        document.documentElement.classList.toggle('phone-blocked', blocked);
        document.documentElement.classList.toggle('student-device-allowed', !blocked);

        let notice = document.getElementById('student-device-notice');
        if (!notice) {
            notice = document.createElement('section');
            notice.id = 'student-device-notice';
            notice.setAttribute('role', 'alert');
            notice.setAttribute('aria-live', 'assertive');
            notice.innerHTML = `
                <div class="device-notice-card">
                    <div class="device-notice-icon" aria-hidden="true">🖥️</div>
                    <p class="device-notice-eyebrow">Perangkat belum didukung</p>
                    <h1>Buka dashboard lewat tablet atau komputer, ya!</h1>
                    <p>Dashboard siswa tidak dapat digunakan melalui HP, termasuk saat HP diputar landscape atau memakai mode “Situs desktop”.</p>
                    <div class="device-notice-devices"><span>Tablet</span><span>Laptop</span><span>PC/Desktop</span></div>
                </div>`;
            document.body.prepend(notice);
        }
        notice.hidden = !blocked;
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyDeviceAccess);
    else applyDeviceAccess();
    addEventListener('orientationchange', applyDeviceAccess);
})();
