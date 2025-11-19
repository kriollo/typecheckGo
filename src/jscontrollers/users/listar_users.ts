import { $dom, serializeToArray } from '@/jscontrollers/composables/dom-selector';
import { show_toast, versaFetch } from '@/jscontrollers/composables/utils';

$('#table_listar_users').dataTable({
    language: {
        search: 'Buscar:',
        zeroRecords: 'No hay datos para mostrar',
        info: 'Mostrando _END_ Registros, de un total de _TOTAL_ ',
        loadingRecords: 'Cargando...',
        processing: 'Procesando...',
        infoEmpty: 'No hay entradas para mostrar',
        lengthMenu: 'Mostrar _MENU_ Filas',
        paginate: {
            first: 'Primera',
            last: 'Ultima',
            next: 'Siguiente',
            previous: 'Anterior',
        },
    },
    autoWidth: true,
    responsive: true,
});

const $btn_reset_pass_user = $dom('#btn_reset_pass_user');
$btn_reset_pass_user.addEventListener('click', async event => {
    event.preventDefault();

    const $form = $dom('#reset_pass_user_form');
    if (!($form instanceof HTMLFormElement)) return;
    if ($form.getAttribute('data-locked') === 'true') return;

    const __data = {};
    serializeToArray($form).map(x => (__data[x.name] = x.value));

    const json = await versaFetch({
        url: '/api/resetpass',
        method: 'POST',
        data: JSON.stringify(__data),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (json.success == 1) {
        show_toast(json.title, json.message, 'success', 'success');
        $('#modal_reset_pass_user').modal('hide');
    } else {
        show_toast(json.title, json.message, 'warning', 'warning');
    }
});

const carga_modal_reset_pass = id_user => {
    $('#modal_reset_pass_user').modal('show');
    const $id_user = $dom('#id_user');
    if ($id_user instanceof HTMLInputElement) {
        $id_user.value = id_user;
    }
};

const carga_modal_select_campus_user = async id_user => {
    const FormD = new FormData();
    FormD.append('id_user', id_user);

    const json = await versaFetch({
        url: '/api/load_modal_campus_usuario',
        method: 'POST',
        data: FormD,
    });

    if (json?.html) {
        $('#carga_select_campus').html(json.html);
        $('#modal_select_campus_user').modal('show');
        const $input_id_user_select_campus_user = $dom('#input_id_user_select_campus_user');
        if ($input_id_user_select_campus_user instanceof HTMLInputElement) {
            $input_id_user_select_campus_user.value = id_user;
        }
    } else {
        show_toast('Error', json.message, 'error', 'error');
    }
};

const $btn_select_campus_user = $dom('#btn_select_campus_user');
$btn_select_campus_user.addEventListener('click', async event => {
    event.preventDefault();

    const $form = $dom('#select_campus_user_form');
    if ($form.getAttribute('data-locked') === 'true') return;

    const formData = new FormData();
    const $input_id_user_select_campus_user = $dom('#input_id_user_select_campus_user');
    if ($input_id_user_select_campus_user instanceof HTMLInputElement) {
        formData.append('id_user', $input_id_user_select_campus_user.value);
    }

    const listCampus = $dom('#selcampus');
    if (listCampus instanceof HTMLSelectElement) {
        const arrCampus = Array.from(listCampus.selectedOptions).map(option => option.value);
        const newCampus = arrCampus.join(',');
        formData.append('campus', newCampus);
    }

    const json = await versaFetch({
        url: '/api/update_modal_campus_usuario',
        method: 'POST',
        data: formData,
    });

    if (json.success == 1) {
        show_toast(json.title, json.message, 'success', 'success');
        $('#modal_select_campus_user').modal('hide');
    } else {
        show_toast(json.title, json.message, 'warning', 'warning');
    }
});

import eventDelegator from '@/jscontrollers/composables/eventDelegator';

eventDelegator.register('listar_users_click', 'click', function (event) {
    const $element = event.target;
    if (!($element instanceof HTMLElement)) return;

    if ($element.matches('[name="showModalSelectCampusUser"]')) {
        const id_user = $element.getAttribute('data-id');
        carga_modal_select_campus_user(id_user);
    }
    if ($element.matches('[name="showModalResetPass"]')) {
        const id_user = $element.getAttribute('data-id');
        carga_modal_reset_pass(id_user);
    }
});
