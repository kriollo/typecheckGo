import { $dom } from '@/jscontrollers/composables/dom-selector';
import { show_toast, versaFetch } from '@/jscontrollers/composables/utils';

const updateAvatar = async () => {
    const FormD = new FormData();
    FormD.append('id_user', ($dom('#id_user') as HTMLInputElement).value);
    const $files = document.getElementById('file_avatar');
    if ($files instanceof HTMLInputElement && $files.files.length > 0) {
        FormD.append('avatar', $files.files[0]);
    }

    const json = await versaFetch({
        url: '/api/updateAvatar',
        method: 'POST',
        data: FormD,
    });
    if (json.success == 1) {
        show_toast('Success', json.message, 'success', 'success');
        if ((window as any).__udd_perfil_reload) clearTimeout((window as any).__udd_perfil_reload);
        (window as any).__udd_perfil_reload = setTimeout(function () {
            location.reload();
        }, 1000);
    } else {
        show_toast('Alerta', json.message, 'Alerta', 'warning');
    }
};
const resetpass = async () => {
    const FormD = new FormData();

    if (($dom('#pass_new') as HTMLInputElement).value == '' || ($dom('#repass_new') as HTMLInputElement).value == '') {
        show_toast('Alerta', 'Debe llenar todos los campos', 'Alerta', 'warning');
        return;
    }

    if (($dom('#pass_new') as HTMLInputElement).value != ($dom('#repass_new') as HTMLInputElement).value) {
        show_toast('Alerta', 'Las contraseñas no coinciden', 'Alerta', 'warning');
        return;
    }

    FormD.append('id_user', ($dom('#id_user') as HTMLInputElement).value);
    FormD.append('pass_new', ($dom('#pass_new') as HTMLInputElement).value);
    FormD.append('repass_new', ($dom('#repass_new') as HTMLInputElement).value);

    const json = await versaFetch({
        url: '/api/resetpass',
        method: 'POST',
        data: FormD,
    });
    if (json.success == 1) {
        show_toast('Success', json.message, 'success', 'success');
        if ((window as any).__udd_perfil_reload) clearTimeout((window as any).__udd_perfil_reload);
        (window as any).__udd_perfil_reload = setTimeout(function () {
            location.reload();
        }, 1000);
    } else {
        show_toast('Alerta', json.message, 'Alerta', 'warning');
    }
};

const $modificar = document.getElementById('modificar');
if ($modificar instanceof HTMLElement) {
    $modificar.addEventListener('click', resetpass);
}

const $file_avatar = document.getElementById('file_avatar');
if ($file_avatar instanceof HTMLElement && $file_avatar instanceof HTMLInputElement) {
    $file_avatar.addEventListener('change', updateAvatar);
}
