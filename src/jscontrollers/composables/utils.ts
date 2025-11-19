import { VersaAlertParams, VersaFetchResponse, VersaParamsFetch } from 'versaTypes';

export const FALSE = false;
export const TRUE = true;

const errorMap = new Map([
    [400, 'El Servidor no pudo procesar la solicitud'],
    [401, 'No está autorizado para acceder a este recurso'],
    [403, 'No tiene permisos para realizar esta acción'],
    [404, 'Recurso no encontrado'],
    [500, 'Error interno del servidor'],
    [503, 'Servicio no disponible'],
    [422, 'No se pudo procesar la solicitud'],
    [429, 'Demasiadas solicitudes, intente de nuevo más tarde'],
    [504, 'El tiempo de espera para el servicio ha sido excedido'],
    [302, 'La solicitud fue redirigida'],
]);

export const format_number_n_decimal = (number, decimal = 2) =>
    new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: decimal,
        maximumFractionDigits: decimal,
    }).format(number);

export const format_number_n_decimal_us = (number, decimal = 2) =>
    new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimal,
        maximumFractionDigits: decimal,
    }).format(number);

export const isNumber = value => {
    const regex = /^-?\d+([,.]\d*)?$/;

    if (typeof value === 'string' && !regex.exec(value)) {
        return false;
    }

    return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Displays a toast notification.
 *
 * @param {string} title - The title of the toast notification.
 * @param {string} message - The message body of the toast notification.
 * @param {string} [subtitle='Error'] - The subtitle of the toast notification. Default is 'Error'.
 * @param {string} [bg='danger'] - The background color of the toast notification. Default is 'danger'.
 */
export const show_toast = (title, message, subtitle = 'Error', bg = 'danger') => {
    // @ts-ignore
    $(document).Toasts('create', {
        class: `bg-${bg}`,
        title: title,
        subtitle: subtitle,
        body: message,
        autohide: true,
        delay: 5000,
    });
};

export const getDiaActual = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const fechaFormateada = `${año}-${mes}-${dia}`;
    return fechaFormateada;
};

export const getAnnoMes = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const fechaFormateada = `${año}-${mes}`;
    return fechaFormateada;
};

export const getAnno = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    return año;
};

export const addDias = (fecha, dias) => {
    // Verificar que los parámetros sean válidos
    if (!fecha || !dias || isNaN(dias)) {
        throw new Error('Los parámetros de fecha y días son obligatorios y deben ser válidos.');
    }

    const fechaActual = new Date(fecha);
    fechaActual.setDate(fechaActual.getDate() + dias);

    // Obtener los valores de año, mes y día
    const { year, month, day } = {
        year: fechaActual.getFullYear(),
        month: String(fechaActual.getMonth() + 1).padStart(2, '0'),
        day: String(fechaActual.getDate()).padStart(2, '0'),
    };

    // Formatear la fecha en formato YYYY-MM-DD
    const fechaFormateada = `${year}-${month}-${day}`;
    return fechaFormateada;
};
export const validateResponeStatus = status => {
    let result = true;

    if (errorMap.has(status)) {
        Swal.fire({
            title: 'Error!',
            text: errorMap.get(status),
            icon: 'error',
            confirmButtonText: 'Aceptar',
        });
        result = false;
    }

    return result;
};
/**
 * @preserve
 * Performs a fetch request with the provided parameters.
 * @param {VersaParamsFetch} params - The parameters for the fetch request.
 * @property {string} url - The URL to which the request will be made.
 * @property {'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'} method - The HTTP method to use for the request.
 * @property {Record<string, string> | HeadersInit} [headers] - The headers to include in the request.
 * @property {FormData | Record<string, any> | string} [data] - The data to include in the request.
 * @property {'omit' | 'same-origin' | 'include'} [credentials='same-origin'] - The credentials policy to use for the request.
 * @returns {Promise<VersaFetchResponse>} The response from the fetch request.
 */
export const versaFetch = async (params: VersaParamsFetch): Promise<VersaFetchResponse> => {
    const { url, method, headers, data, credentials = 'same-origin' } = params;

    const init = {
        method: method || 'POST',
        headers: headers || {},
        credentials: credentials,
        body: null,
    };

    if (typeof data === 'object' && !(data instanceof FormData) && (headers === null || headers === undefined)) {
        // traspasar data a formdata
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, data[key]);
        }
        init.body = formData;
    } else if (data) {
        init.body = data;
    }

    try {
        const response = await fetch(url, init);
        const contentType = response.headers.get('Content-Type');
        const isJson = contentType?.includes('application/json');
        const body = isJson ? await response.json() : await response.text();

        if (!validateResponeStatus(response.status)) {
            if (isJson) {
                throw new Error(JSON.stringify(body));
            } else if (contentType?.includes('text/html') || contentType === null) {
                const message = errorMap.get(response.status);
                throw new Error(JSON.stringify({ success: 0, message: message }));
            }
        }

        return body;
    } catch (e) {
        //devolver json para que se pueda utilizar con wait res.json()
        return JSON.parse(e.message);
    }
};

export const versaAlert = async (Params: VersaAlertParams) => {
    const { title = '¡Éxito!', message = '', html = '', type = 'success', AutoClose = true, callback } = Params;
    const result = await Swal.fire({
        title: title,
        text: message,
        html: html,
        icon: type,
        confirmButtonText: 'Aceptar',
        allowOutsideClick: true,
        allowEscapeKey: true,
        allowEnterKey: true,
        timer: AutoClose ? 3000 : null,
    });
    if (result && typeof callback === 'function') {
        return callback();
    }
};

/**
 * Removes duplicate objects from an array based on a specified key.
 *
 * @param campo - The key of the object to use for uniqueness comparison.
 * @param array_search - The array of objects to filter for unique entries.
 * @returns A new array containing only unique objects based on the specified key.
 *
 * @example
 * const data = [
 *   { id: 1, name: 'Alice' },
 *   { id: 2, name: 'Bob' },
 *   { id: 1, name: 'Alice' }
 * ];
 * const uniqueData = GetUniquedArrayObject('id', data);
 * // uniqueData = [
 * //   { id: 1, name: 'Alice' },
 * //   { id: 2, name: 'Bob' }
 * // ];
 */
export const GetUniquedArrayObject = (campo: string, array_search: any[]) => {
    let array_result = [];
    if (Array.isArray(array_search)) {
        const key = campo;
        array_result = [...new Map(array_search.map(item => [item[key], item])).values()];
    }
    return array_result;
};

export const getCookieByName = name => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const cookieTrim = cookie.trim();
            if (cookieTrim.substring(0, name.length + 1) === `${name}=`) {
                cookieValue = decodeURIComponent(cookieTrim.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
};
export const focusElement = id => {
    const $element = document.querySelector(`#${id}`);
    if ($element instanceof HTMLElement) {
        $element.focus();
    }
};

/**
 * Capitalizes the first letter of a given text and converts the rest of the text to lowercase.
 *
 * @param {string} text - The text to be capitalized.
 * @returns {string} - The capitalized text.
 */
export const text_capitalize = text => {
    let textCapitalize = text.toString();
    textCapitalize = textCapitalize.charAt(0).toUpperCase() + textCapitalize.slice(1).toLowerCase();
    return textCapitalize;
};

export const pasarella = (vueInstancia, event, funcion = 'pasarella') => {
    const boton = event.target.closest('[name="pasarella"]');
    if (boton) {
        try {
            event.preventDefault();
            const params = JSON.parse(boton.getAttribute('data-value'));
            vueInstancia[funcion](params);
        } catch (error) {
            show_toast('Error', error.message);
        }
    }
};

export const obtenerDV = rut => {
    let M = 0,
        S = 1;
    for (; rut; rut = Math.floor(rut / 10)) S = (S + (rut % 10) * (9 - (M++ % 6))) % 11;
    return S ? S - 1 : 'K';
};

export const existCookie = name => {
    return document.cookie.split(';').some(c => {
        return c.trim().startsWith(`${name}=`);
    });
};

export const checkEmailFormat = email => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
};
