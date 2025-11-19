import { $dom, blockedForm, serializeToArray } from '@/jscontrollers/composables/dom-selector';
import { show_toast, versaFetch } from '@/jscontrollers/composables/utils';

const update_perfil_user = $dom('#update_perfil_user');
update_perfil_user.addEventListener('click', async event => {
    event.preventDefault();

    const $form = $dom('#form_user_perfil');
    if (!($form instanceof HTMLFormElement)) return;
    if ($form.getAttribute('data-locked') === 'true') return;

    const __data = {};
    serializeToArray($form).map(x => (__data[x.name] = x.value));
    blockedForm($form, 'true');
    const json = await versaFetch({
        url: '/api/update_perfil_usuario',
        method: 'POST',
        data: JSON.stringify(__data),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (json.success == 1) {
        show_toast(json.title, json.message, 'success', 'success');
        if ((window as any).__udd_update_perfil_redirect) clearTimeout((window as any).__udd_update_perfil_redirect);
        (window as any).__udd_update_perfil_redirect = setTimeout(function () {
            location.href = '/users/usuarios';
        }, 1000);
    } else {
        show_toast(json.title, json.message, 'warning', 'warning');
    }
    blockedForm($form, 'false');
});
