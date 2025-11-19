import { $dom, $domAll, blockedForm, serializeToArray } from '@/jscontrollers/composables/dom-selector';
import { show_toast, versaFetch } from '@/jscontrollers/composables/utils';

const mostar_datos_perfil = async () => {
    const FormD = new FormData();
    const $selectPerfil = $dom('#select_perfil');
    if (!($selectPerfil instanceof HTMLSelectElement)) return;

    FormD.append('id', $selectPerfil.value);

    const json = await versaFetch({
        url: '/api/get_data_perfil',
        method: 'POST',
        data: FormD,
    });

    $('#perfil').val($('#select_perfil').val());
    if (json.success == 1) {
        $.each(json.data, function (index, value) {
            if (value['checked'] == 1) $(`#check-${value['id_menu']}-${value['id_submenu']}`).prop('checked', true);
            else $(`#check-${value['id_menu']}-${value['id_submenu']}`).prop('checked', false);
        });
    } else {
        show_toast(json.title, json.message, 'warning', 'warning');
    }
};

const $select_perfil = $dom('#select_perfil');
$select_perfil.addEventListener('change', mostar_datos_perfil);
const $consultar = $dom('#consultar');
$consultar.addEventListener('click', mostar_datos_perfil);

const $btn_new_perfil = $dom('#btn_new_perfil');

$btn_new_perfil.addEventListener('click', async event => {
    event.preventDefault();

    const FormD = new FormData();
    const $new_perfil = $dom('#new_perfil');
    if ($new_perfil instanceof HTMLInputElement) {
        FormD.append('new_perfil', $new_perfil.value);
    }

    const $form = $dom('#new_perfil_form');
    if (!($form instanceof HTMLFormElement)) return;
    if ($form.getAttribute('data-locked') === 'true') return;

    blockedForm($form, 'true');

    if (!FormD.get('new_perfil')) {
        show_toast('Error', 'El campo no puede estar vacío', 'error', 'danger');
        blockedForm($form, 'false');
        return;
    }

    const json = await versaFetch({
        url: '/api/new_perfil',
        method: 'POST',
        data: FormD,
    });
    if (json.success == 1) {
        show_toast(json.title, json.message, 'success', 'success');
        if ((window as any).__udd_gest_perfiles_reload) clearTimeout((window as any).__udd_gest_perfiles_reload);
        (window as any).__udd_gest_perfiles_reload = setTimeout(() => {
            location.reload();
        }, 1000);
    } else {
        show_toast(json.title, json.message, 'warning', 'warning');
    }
    blockedForm($form, 'false');
});

const $update_get_perfil = $domAll('button[name="update_get_perfil"]');
$update_get_perfil.forEach(btn => {
    btn.addEventListener('click', async event => {
        event.preventDefault();

        const $form = $dom('#form_gest_perfil');
        if (!($form instanceof HTMLFormElement)) return;
        if ($form.getAttribute('data-locked') === 'true') return;

        const __data = {};
        serializeToArray($form).map(function (x) {
            __data[x.name] = x.value;
        });

        blockedForm($form, 'true');
        const json = await versaFetch({
            url: '/api/update_gest_perfil',
            method: 'POST',
            data: JSON.stringify(__data),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (json.success == 1) {
            show_toast(json.title, json.message, 'success', 'success');
        } else {
            show_toast(json.title, json.message, 'warning', 'warning');
        }
        blockedForm($form, 'false');
    });
});

const $deleteperfil = $dom('#deleteperfil');
$deleteperfil.addEventListener('click', async event => {
    event.preventDefault();

    const FormD = new FormData();
    const $select_perfil = $dom('#select_perfil');
    if ($select_perfil instanceof HTMLSelectElement) {
        FormD.append('id', $select_perfil.value);
    }

    const $form = $dom('#form_gest_perfil');
    if (!($form instanceof HTMLFormElement)) return;
    if ($form.getAttribute('data-locked') === 'true') return;

    blockedForm($form, 'true');
    const json = await versaFetch({
        url: '/api/delete_gest_perfil',
        method: 'POST',
        data: FormD,
    });
    if (json.success == 1) {
        show_toast(json.title, json.message, 'success', 'success');
        if ((window as any).__udd_gest_perfiles_reload) clearTimeout((window as any).__udd_gest_perfiles_reload);
        (window as any).__udd_gest_perfiles_reload = setTimeout(() => {
            location.reload();
        }, 1000);
    } else {
        show_toast(json.title, json.message, 'warning', 'warning');
    }
    blockedForm($form, 'false');
});
