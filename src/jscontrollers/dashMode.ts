import { $dom } from '@/jscontrollers/composables/dom-selector';
import { existCookie, getCookieByName, versaFetch } from '@/jscontrollers/composables/utils';

const setModeUser = () => {
    if (!owner_user) return;
    const darkMode = localStorage.getItem('dark-mode') === 'true' ? 1 : 0;
    versaFetch({
        url: '/api/setModeUser',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({ id_user: owner_user.id_user, darkMode }),
    });
};
const setLabel = (chk: HTMLInputElement, $nav: HTMLDivElement = null) => {
    const label = $dom('.label') as HTMLDivElement;
    const ball = $dom('.ball') as HTMLDivElement;
    if (chk.checked) {
        const labelWidth = label.offsetWidth; // Ancho total del .label, incluyendo padding y border
        const ballWidth = ball.offsetWidth; // Ancho de la bolita
        // Ajusta este factor (0.85) según necesites. Prueba y error.
        const translateXValue = (labelWidth - ballWidth) * 0.85;

        ball.style.transform = `translateX(${translateXValue}px)`;
        if ($nav) {
            // Asegurar que el header use la variante dark
            $nav.classList.remove('navbar-white');
            $nav.classList.remove('navbar-light');
            $nav.classList.add('navbar-dark');
        }
    } else {
        ball.style.transform = 'translateX(0px)'; // Volver a la posición inicial
        if ($nav) {
            // Restaurar variantes claras en el header
            $nav.classList.add('navbar-light');
            $nav.classList.add('navbar-white');
            $nav.classList.remove('navbar-dark');
        }
    }
};

const chk = $dom('#chkMode');
if (chk instanceof HTMLInputElement) {
    chk.addEventListener('change', () => {
        const isDark = !document.body.classList.contains('dark-mode');
        // add short transition class to root to animate CSS variable changes
        document.documentElement.classList.add('theme-transition');
        window.setTimeout(() => document.documentElement.classList.remove('theme-transition'), 350);
        // update dataset theme for CSS variables
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        document.body.classList.toggle('dark-mode', isDark);
        document.documentElement.classList.toggle('dark', isDark);

        const $nav = $dom('nav') as HTMLDivElement;
        localStorage.setItem('dark-mode', document.body.classList.contains('dark-mode').toString());

        setLabel(chk, $nav);

        const $bgImg = $dom('.bg-imagen');
        if ($bgImg instanceof HTMLImageElement) {
            if (document.body.classList.contains('dark-mode')) {
                $bgImg.src = '/assets/adminwys/img/trianglify-lowres-dark.png';
            } else {
                $bgImg.src = '/assets/adminwys/img/trianglify-lowres.png';
            }
        }

        // Forzar actualización de clases del navbar por seguridad
        if ($nav) {
            if (isDark) {
                $nav.classList.remove('navbar-light', 'navbar-white');
                $nav.classList.add('navbar-dark');
            } else {
                $nav.classList.remove('navbar-dark');
                $nav.classList.add('navbar-light', 'navbar-white');
            }
        }

        if (existCookie('session_hash')) {
            setModeUser();
        }
    });
}

const fnDarkLightMode = (): void => {
    const chk = $dom('#chkMode') as HTMLInputElement;
    const $body = $dom('body') as HTMLBodyElement;
    const $nav = $dom('nav') as HTMLDivElement;
    const $document = document as HTMLDocument;
    const darkMode = localStorage.getItem('dark-mode') === 'true';
    if (chk instanceof HTMLInputElement && $body) {
        if (darkMode) {
            chk.checked = true;
            $body.classList.add('dark-mode');
            $document.documentElement.classList.add('dark');
            $document.documentElement.dataset.theme = 'dark';
        } else {
            chk.checked = false;
            $body.classList.remove('dark-mode');
            $document.documentElement.classList.remove('dark');
            $document.documentElement.dataset.theme = 'light';
        }

        setLabel(chk, $nav);

        // Asegurar que el navbar tenga la clase correcta al iniciar
        if ($nav) {
            if (darkMode) {
                $nav.classList.remove('navbar-light', 'navbar-white');
                $nav.classList.add('navbar-dark');
            } else {
                $nav.classList.remove('navbar-dark');
                $nav.classList.add('navbar-light', 'navbar-white');
            }
        }
    }
    const $bgImg = $dom('.bg-imagen');
    if ($bgImg instanceof HTMLImageElement) {
        if (darkMode) {
            $bgImg.src = '/assets/adminwys/img/trianglify-lowres-dark.png';
        } else {
            $bgImg.src = '/assets/adminwys/img/trianglify-lowres.png';
        }
    }

    if (existCookie('dark_mode')) {
        if (getCookieByName('dark_mode') !== (localStorage.getItem('dark-mode') === 'true' ? 1 : 0)) {
            setModeUser();
        }
    }
};

fnDarkLightMode();

// setear el modo del menu
const setMenuMode = (): void => {
    if (!owner_user) return;
    const compactMode = localStorage.getItem('compact_menu') === 'true' ? 1 : 0;
    versaFetch({
        url: '/api/setCompactMenu',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({ id_user: owner_user.id_user, compactMode }),
    });
};

const $pushmenu = $dom('[data-widget="pushmenu"]');
if ($pushmenu instanceof HTMLAnchorElement) {
    $pushmenu.addEventListener('click', e => {
        e.preventDefault();
        setMenuMode();
    });
}
