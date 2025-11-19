import { $dom, blockedForm, serializeToArray } from '@/jscontrollers/composables/dom-selector';
import { versaAlert, versaFetch } from '@/jscontrollers/composables/utils';

async function login() {
    const $form = $dom('#login_form');

    if (!($form instanceof HTMLFormElement)) return;

    if ($form.getAttribute('data-locked') === 'true') return;

    const __data = {};
    serializeToArray($form).map(x => (__data[x.name] = x.value));
    blockedForm($form, 'true');

    const json = await versaFetch({
        url: '/api/login',
        method: 'POST',
        data: JSON.stringify(__data),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (json.success === 1) {
        versaAlert({
            title: json.title,
            message: json.message,
            type: 'success',
            callback: () => {
                location.href = '/portal';
            },
        });
    } else {
        versaAlert({
            title: json.title ?? 'Alerta',
            message: json.message,
            type: 'warning',
        });
    }

    blockedForm($form, 'false');
}
async function recover_pass() {
    const $formRecover = $dom('#lostpass_form');

    if (!($formRecover instanceof HTMLFormElement)) return;

    if ($formRecover.getAttribute('data-locked') === 'true') return;

    const loading = $dom('#loading') as HTMLSpanElement;
    loading.style.display = 'block';

    const data = {};
    serializeToArray($formRecover).map(x => (data[x.name] = x.value));
    blockedForm($formRecover, 'true');

    const json = await versaFetch({
        url: '/api/lostpass',
        method: 'POST',
        data: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (json.success === 1) {
        versaAlert({
            title: json.title,
            message: json.message,
            type: 'success',
            callback: () => {
                history.back();
            },
        });
    } else {
        versaAlert({
            title: json.title ?? 'Alerta',
            message: json.message,
            type: 'warning',
        });
    }
    loading.style.display = 'none';
    blockedForm($formRecover, 'false');
}

// page login
const $btn_login = $dom('#login');
if ($btn_login instanceof HTMLButtonElement) {
    $btn_login.addEventListener('click', login);
}
const $iPass = $dom('#pass');
if ($iPass instanceof HTMLInputElement) {
    $iPass.addEventListener('keypress', event => {
        if (event.key === 'Enter') {
            login();
        }
    });
}
const $form = $dom('#login_form');
if ($form instanceof HTMLFormElement) {
    $form.addEventListener('submit', event => {
        event.preventDefault();
    });
}

// page recover
const $btnRecoverPass = $dom('#recover_pass');
if ($btnRecoverPass instanceof HTMLButtonElement) {
    $btnRecoverPass.addEventListener('click', recover_pass);
}

const $formRecover = $dom('#lostpass_form');
if ($formRecover instanceof HTMLFormElement) {
    $formRecover.addEventListener('submit', event => {
        event.preventDefault();
    });
}
