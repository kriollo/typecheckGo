import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import modal from '@/jscontrollers/components/modal';
/* eslint-disable */
const m = modal;
/* eslint-enable */

Vue.component('tarjetaProveedor', {
    name: 'tarjetaProveedor',
    emits: ['accion'],
    props: {
        proveedor: {
            type: Object,
            required: true,
        },
        col: {
            type: Number,
            default: 6,
        },
    },
    methods: {
        regularizaNumero(numero) {
            if (numero == '' && numero == null) return '';
            // Eliminar todos los caracteres no numéricos
            const digitsOnly = numero.replace(/\D/g, '');

            // Si el número comienza con 56, eliminar el 56
            const trimmedNumber = digitsOnly.startsWith('56') ? digitsOnly.slice(2) : digitsOnly;

            // Si el número no comienza con 9, agregarlo como prefijo para números de celular
            return /^[89]/.test(trimmedNumber) ? `+569${trimmedNumber.slice(1, 9)}` : `+56${trimmedNumber}`;
        },
        isCelular(numero) {
            const numeroRegularizado = this.regularizaNumero(numero);
            if (numeroRegularizado == '') return '';

            // Expresión regular para validar el formato del número chileno (ejemplo: +56 9 xxxxxxxx)
            const regex = /^(\+?56)?(\s?)(0?9)(\s?)[98765432]\d{7}$/;

            // Validar si el número coincide con la expresión regular
            if (regex.test(numeroRegularizado)) {
                // Obtener el número sin el prefijo del país y el 9 inicial (solo los dígitos)
                const digits = numeroRegularizado.replace(/\D/g, '');

                // Verificar si los dígitos representan un número de teléfono celular
                const celularRegex = /^(\+?56)?(\s?)(0?9)(\s?)[98765432]\d{7}$/;
                if (celularRegex.exec(digits)) {
                    // Es un número de teléfono celular, generar el HTML con el enlace de WhatsApp
                    const link = `https://api.whatsapp.com/send?phone=${digits}`;

                    // Retornar el HTML completo
                    return html`
                        <a style="color: rgb(0 220 255);" href="${link}" target="_blank">${numero}</a>
                    `;
                }
            }

            // No es un número de celular o el formato es incorrecto, mostrar el número tal cual en texto
            return numero;
        },
    },
    template: html`
        <div class="elevation-24 shadow-md" :class="'col-md-'+col">
            <div class="info-box bg-gradient-gray" style="display: flex; flex-direction: column;">
                <span class="info-box-icon"></span>
                <div class="info-box-content">
                    <span class="info-box-text mb-0">
                        <h4 class="mb-0">
                            <i
                                :class="proveedor.val_asociado == 1?'bi bi-patch-check-fill text-primary':'bi bi-patch-check text-warning'"
                                :title="proveedor.asociado"></i>
                            {{ proveedor.nombre }}
                        </h4>
                    </span>
                    <span class="info-box-text">{{ proveedor.rut }}</span>
                    <span class="info-box-text">
                        <i class="fas fa-phone"></i>
                        {{ proveedor.telefono }}
                    </span>
                    <span class="info-box-text">
                        <i class="fas fa-globe"></i>
                        <a
                            class="link-aqua"
                            style="color: rgb(0 220 255);"
                            :href="'http://'+proveedor.web"
                            target="_blank">
                            {{ proveedor.web }}
                        </a>
                    </span>
                    <span class="info-box-text">
                        <i class="fas fa-calendar-alt" title="Fecha Ultima compra"></i>
                        {{ proveedor.fecha_ultima_compra | format_solo_fecha }}
                    </span>
                </div>

                <div class="info-box-footer overflow-auto">
                    <table class="table table-sm table-bordered m-0">
                        <thead>
                            <th>Nombre</th>
                            <th>Telefono</th>
                            <th>Email</th>
                        </thead>
                        <tbody>
                            <tr :key="contacto.id" v-for="contacto in proveedor.contactos">
                                <td>{{ contacto.nombrecontacto | capitalize }}</td>
                                <td v-html="isCelular(contacto.telefonocontacto)"></td>
                                <td>
                                    <a
                                        style="color: rgb(0 220 255);"
                                        :href="'mailto:'+contacto.email+'?subject=Contacto a proveedor'">
                                        {{ contacto.email }}
                                    </a>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,
});

export default {
    name: 'tarjetaProveedor',
};
