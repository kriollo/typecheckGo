import { versaFetch } from '@/jscontrollers/composables/utils';

export const fecthCampus = async () => {
    const response = await versaFetch({
        url: '/api/getCampus',
        method: 'POST',
    });
    return response;
};

export const fetchGetAreas = async campus => {
    const response = await versaFetch({
        url: '/api/getAreas',
        method: 'POST',
        data: JSON.stringify({ codigo: campus, estado: '1' }),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response;
};

export const fetchGetCGestion = async (campus, area) => {
    const response = await versaFetch({
        url: '/api/getCentroGestion',
        method: 'POST',
        data: JSON.stringify({
            codigo_campus: campus,
            codigo_area: area,
            estado: '1',
        }),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response;
};

export const fetchProyectos = async (params = { estado: '1', origen: null }) => {
    const response = await versaFetch({
        url: '/api/getProyectos',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify(params),
    });
    return response;
};

export const fetchAllDependencias = async () => {
    const response = await versaFetch({
        url: '/api/geda/getAllDependencias',
        method: 'GET',
    });
    return response;
};

export const fetchCGestion = async params => {
    const response = await versaFetch({
        url: '/api/getCentroGestion',
        method: 'POST',
        data: JSON.stringify(params),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response;
};

export const fetchgetProveedores = async params => {
    const response = await versaFetch({
        url: '/api/getProveedor',
        method: 'POST',
        data: JSON.stringify(params),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response;
};

export const fetchEdificios = async campus => {
    const response = await versaFetch({
        url: `/api/getEdificiosPaginate?page=1&per_page=1000000000&externalFilters=cod_campus=${campus} AND me.estado=1`,
        method: 'POST',
        data: JSON.stringify({ campus }),
    });
    if (response.success === 1) {
        return response.data;
    }
    return [];
};
export const fetchPisos = async edificio => {
    const response = await versaFetch({
        url: `/api/geda/getPisosPaginate?page=1&per_page=1000000000&externalFilters=id_edificio=${edificio} AND estado=1`,
        method: 'POST',
        data: JSON.stringify({ edificio }),
    });
    if (response.success === 1) {
        return response.data;
    }
    return [];
};
export const fetchDependencias = async piso => {
    const response = await versaFetch({
        url: `/api/geda/getDependenciasPaginate?page=1&per_page=1000000000&externalFilters=id_piso=${piso} AND tu.estado=1`,
        method: 'POST',
        data: JSON.stringify({ piso }),
    });
    if (response.success === 1) {
        return response.data;
    }
    return [];
};

export const fecthCuentaContable = async () => {
    const response = await versaFetch({
        url: '/api/getCuentaContable',
        method: 'POST',
    });

    return response;
};

export const fetchGetCuentaGasto = async params => {
    const response = await versaFetch({
        url: '/api/getCuentaGasto',
        method: 'POST',
        data: JSON.stringify(params),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response;
};

export const fetchUnidadGasto = async params => {
    const response = await versaFetch({
        url: '/api/getUnidadGastos',
        method: 'POST',
        data: JSON.stringify(params),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response;
};

export const fetchCondicion1 = async () => {
    const response = await versaFetch({
        url: '/api/getCondiciones1',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({ estado: '1' }),
    });
    return response;
};
export const fetchCondicion2 = async () => {
    const response = await versaFetch({
        url: '/api/getCondiciones2',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({ estado: '1' }),
    });
    return response;
};

export const fetchUsuarioSolicitante = async params => {
    const response = await versaFetch({
        url: '/api/getSolicitantes',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify(params),
    });
    return response;
};

export const fetchGetTipoCodigo = async () => {
    const response = await versaFetch({
        url: '/api/getTipoCodigo',
        method: 'POST',
        data: JSON.stringify({ estado: '1' }),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response;
};
export const fetchGetProductos = async tipoCodigo => {
    const response = await versaFetch({
        url: '/api/getCodigoByTipo',
        method: 'POST',
        data: JSON.stringify({ id_tipocodigo: tipoCodigo, estado: '1' }),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response;
};
export const fetchBodegas = async params => {
    const response = await versaFetch({
        url: '/api/getBodegas',
        method: 'POST',
        data: JSON.stringify(params),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response;
};

export const fetchGetBodegaByCodigo = async params => {
    const response = await versaFetch({
        url: '/api/getBodegasByCodigo',
        method: 'POST',
        data: JSON.stringify(params),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response;
};
export const fetchGetTipoDocumento = async params => {
    const response = await versaFetch({
        url: '/api/getTipoDocumento',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(params),
    });
    return response;
};

export const fetchGetFamilia1 = async params => {
    const response = await versaFetch({
        url: '/api/getFamilia1',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(params),
    });
    return response;
};
export const fetchGetFamilia2 = async params => {
    const response = await versaFetch({
        url: '/api/getFamilia2',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(params),
    });
    return response;
};
export const fetchGetUnidadMedida = async params => {
    const response = await versaFetch({
        url: '/api/getUnidadMedida',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(params),
    });
    return response;
};

export const fetchGetContactosProveedor = async params => {
    const response = await versaFetch({
        url: '/api/getContactosProveedor',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({
            rut: params.rut,
            estado: 'all',
        }),
    });
    return response;
};
