import { versaFetch } from '@/jscontrollers/composables/utils';

export const TOPE_RETENCION = 50000000;

export const fetchFilesById = async (/** @type {Number} */ id) => {
    const response = await versaFetch({
        url: '/api/getAllFilesSOCByIdSoc',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({
            id,
        }),
    });
    return response;
};
export const fetchAprobatorsById = async (/** @type {Number} */ id) => {
    const response = await versaFetch({
        url: '/api/getAprobatorsByIdSolicitud',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({
            id_solicitud: id,
        }),
    });
    return response;
};
export const fetchDeleteSOCById = async (/** @type {Number} */ id) => {
    const response = await versaFetch({
        url: '/api/deleteSOCById',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({
            id,
        }),
    });
    return response;
};
export const fetchReSendMailAprobator = async (/** @type {Object} */ params) => {
    const response = await versaFetch({
        url: '/api/reSendMailAprobator',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({
            soc_encabezado_id: params.soc_encabezado_id,
            token_participante: params.token_participante,
        }),
    });
    return response;
};
export const fetchaprobMakeHESMIGO = async (/** @type {number} */ id) => {
    const response = await versaFetch({
        url: '/api/aprobMakeHESMIGO',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({
            id,
        }),
    });
    return response;
};
export const fetchCGestionBySOCId = async (/** @type {number} */ id) => {
    const response = await versaFetch({
        url: '/api/getCGestionBySOCId',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({
            id,
        }),
    });
    return response;
};

export const fetchAddAprobator = async (/** @type {Object} */ params) => {
    const response = await versaFetch({
        url: '/api/saveNewParticipante',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify(params),
    });
    return response;
};
