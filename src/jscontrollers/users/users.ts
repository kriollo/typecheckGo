import { fecthCampus } from '@/jscontrollers/composables/fetching';
import { FALSE, TRUE, show_toast, versaFetch } from '@/jscontrollers/composables/utils';

// Defensive timeout handle to avoid accumulating multiple redirects
let __redirTimeoutUsers: number | null = null;

const _appUsers = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    data: () => ({
        array_user: [],
        array_campus_option: [],
        array_perfiles: [],
        name: '',
        email: '',
        perfil: '',
        pagina_inicio: '',
        rol: '',
        password: '',
        password_repeat: '',
        id_user: '',
    }),
    mounted: async function () {
        // Carga Campus
        const response = await fecthCampus();
        this.array_campus_option = response.map(value => ({
            text: value.descripcion,
            value: value.id,
            selected: false,
        }));

        // Carga Perfiles
        this.array_perfiles = [
            {
                text: '--',
                value: '--',
            },
            {
                text: 'DEFINIDO',
                value: 'DEFINIDO',
            },
        ];
        const json = await versaFetch({
            url: '/api/getPerfiles',
            method: 'POST',
        });
        this.array_perfiles = json.map(value => ({
            text: value.nombre,
            value: value.nombre,
        }));

        const $idUser = document.querySelector('#id_user');
        if (!($idUser instanceof HTMLInputElement)) return;
        this.id_user = $idUser.value;

        // Buscar Usuario a editar
        if (this.id_user !== '') {
            const FormD = new FormData();
            FormD.append('id_user', this.id_user);

            const response = await versaFetch({
                url: '/api/getUserByIdPOST',
                method: 'POST',
                data: FormD,
            });

            this.name = response.name;
            this.email = response['email'];
            this.perfil = response['perfil'];
            this.pagina_inicio = response['pagina_inicio'];
            if (response['rol'] == 1) {
                this.rol = true;
            }
            this.array_campus_option = response.campus.map(value => ({
                text: value.descripcion,
                value: value.id,
                selected: value.selected === 0 ? FALSE : TRUE,
            }));
        }
    },
    methods: {
        registeruser: async function () {
            const FormD = new FormData();
            FormD.append('name', this.name);
            FormD.append('email', this.email);
            FormD.append('pass', this.password);
            FormD.append('pass_repeat', this.password_repeat);
            FormD.append('perfil', this.perfil);
            FormD.append('pagina_inicio', this.pagina_inicio);
            FormD.append('rol', this.rol ? '1' : '0');

            const listCampus = document.getElementById('selcampus');
            if (!(listCampus instanceof HTMLSelectElement)) return;
            const arrCampus = Array.from(listCampus.selectedOptions).map(option => option.value);
            const newCampus = arrCampus.join(',');

            FormD.append('campus', newCampus);

            const $ocrendForm = $(this);
            const __data = {};
            $('#register_user_form')
                .serializeArray()
                .map(x => {
                    __data[x.name] = x.value;
                    return x;
                });

            if (undefined === $ocrendForm.data('locked') || FALSE === $ocrendForm.data('locked')) {
                $ocrendForm.data('locked', true);

                const json = await versaFetch({
                    url: '/api/registeruser',
                    method: 'POST',
                    data: FormD,
                });

                if (json.success === 1) {
                    show_toast(json.title, json.message, 'success', 'success');
                    if (__redirTimeoutUsers) clearTimeout(__redirTimeoutUsers);
                    __redirTimeoutUsers = window.setTimeout(() => {
                        location.href = '/users/usuarios';
                    }, 1000);
                } else {
                    show_toast(json.title, json.message, 'warning', 'warning');
                }
                $ocrendForm.data('locked', false);
            }
        },
        updateuser: async function () {
            const FormD = new FormData();

            FormD.append('id_user', this.id_user);
            FormD.append('name', this.name);
            FormD.append('email', this.email);
            FormD.append('pass', this.password);
            FormD.append('pass_repeat', this.password_repeat);
            FormD.append('perfil', this.perfil);
            FormD.append('pagina_inicio', this.pagina_inicio);
            FormD.append('rol', this.rol ? '1' : '0');

            const listCampus = document.getElementById('selcampus');
            if (!(listCampus instanceof HTMLSelectElement)) return;
            const arrCampus = Array.from(listCampus.selectedOptions).map(option => option.value);
            const newCampus = arrCampus.join(',');

            FormD.append('campus', newCampus);

            const $ocrendForm = $(this);
            const __data = {};
            $('#register_user_form')
                .serializeArray()
                .map(x => {
                    __data[x.name] = x.value;
                    return x;
                });

            if (undefined === $ocrendForm.data('locked') || FALSE === $ocrendForm.data('locked')) {
                $ocrendForm.data('locked', true);
                const json = await versaFetch({
                    url: '/api/updateuser',
                    method: 'POST',
                    data: FormD,
                });

                if (json.success === 1) {
                    show_toast(json.title, json.message, 'success', 'success');
                    if (__redirTimeoutUsers) clearTimeout(__redirTimeoutUsers);
                    __redirTimeoutUsers = window.setTimeout(() => {
                        location.href = '/users/usuarios';
                    }, 1000);
                } else {
                    show_toast(json.title, json.message, 'warning', 'warning');
                }
                $ocrendForm.data('locked', false);
            }
        },
    },
});
