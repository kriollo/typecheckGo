import { versaFetch } from '@/jscontrollers/composables/utils';

export const fetchSaveEdificio = async (
    /** @type {string} */ url,
    /** @type {{ id: any; estado: number | boolean; cod_campus?: any; descripcion?: any; }} */ edificio
) => {
    const response = await versaFetch({
        url: url,
        method: 'POST',
        data: JSON.stringify(edificio),
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(response => response);
    return response;
};

export const fetchSavePiso = async (
    /** @type {string} */ url,
    /** @type {{ id: any; estado: number | boolean; id_edificio?: any; descripcion?: any; }} */ piso
) => {
    const response = await versaFetch({
        url: url,
        method: 'POST',
        data: JSON.stringify(piso),
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(response => response);
    return response;
};

export const fetchImportDataFile = async (
    /** @type {String} */ url,
    /** @type {Object} */ data
) => {
    const response = await versaFetch({
        url: url,
        method: 'POST',
        data: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(response => response);
    return response;
};

export const fetchSaveDependecia = async (
    /** @type {string} */ url,
    /** @type {{ id: any; estado: number | boolean; id_piso?: any; descripcion?: any; }} */ dependencia
) => {
    const response = await versaFetch({
        url: url,
        method: 'POST',
        data: JSON.stringify(dependencia),
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(response => response);
    return response;
};

export const fetchGetDataByCodigoActivo = async (
    /** @type {string} */ url,
    /** @type {string} */ codigo_activo
) => {
    const response = await versaFetch({
        url: `${url}?codigo_activo=${codigo_activo}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(response => response);
    return response;
};

export const fetchGetMotivoBaja = async (/** @type {string} */ url) => {
    const response = await versaFetch({
        url: url,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response;
};

export const fetchGetDetalleAsignacionValeSalida = async (
    /** @type {string} */ url,
    /** @type {number} */ id
) => {
    const response = await versaFetch({
        url: `${url}?id=${id}`,
        method: 'GET',
    });
    return response;
};

export const generateFileBarCode = async data => {
    let code = `I8,A,001

            Q240,024
            q831
            rN
            S2
            D15
            ZT
            JF
            OD
            R215,0
            f100
            N
            `;
    code = code.replace(/ /g, '');
    const col = 20;

    // code += `A${col},10,0,3,1,1,N,"10"
    //             A${col},30,0,3,1,1,N,"....30"
    //             A${col},50,0,3,1,1,N,"........50"
    //             A${col},70,0,3,1,1,N,"..............70"
    //             A${col},90,0,3,1,1,N,"...................90"
    //             A${col},110,0,3,1,1,N,".........................110"
    //             A${col},130,0,3,1,1,N,".......................130"
    //             A${col},150,0,3,1,1,N,"....................150"
    //             A${col},170,0,3,1,1,N,"................170"
    //             A${col},190,0,3,1,1,N,"............190"
    //             A${col},210,0,3,1,1,N,".........210"

    let flat = true;
    data.forEach(item => {
        if (
            item.desc_dependencia === '' ||
            item.desc_dependencia === null ||
            item.desc_dependencia === undefined
        ) {
            flat = false;
            return '';
        }
        code += `
A${col},10,0,3,1,1,N,"${item.cod_dependencia}"
${
    item.desc_dependencia.length > 27
        ? `
A${col},30,0,3,1,1,N,"${item.desc_dependencia.substring(0, 27)}-"
A${col},50,0,3,1,1,N,"${item.desc_dependencia.substring(27, 50).trim()}"
`
        : `
A${col},30,0,3,1,1,N,"${item.desc_dependencia}"
`
}
A${col},80,0,3,1,1,N,"${item.codigo_activo}"
${
    item.desc_codigo.length > 27
        ? `
A${col},100,0,3,1,1,N,"${item.desc_codigo.substring(0, 27)}-"
A${col},120,0,3,1,1,N,"${item.desc_codigo.substring(27, 50).trim()}"
        `
        : `
A${col},100,0,3,1,1,N,"${item.desc_codigo}"
    `
}

B${col + 10},150,0,1,2,4,50,N,"${item.codigo}"
A${col + 10},210,0,3,1,1,N,"${item.codigo}"

A${col + 260},210,0,3,1,1,N,"UDD - WYS"

P1
N`;
    });

    if (!flat) {
        return '';
    }

    code += `Q1\n
ESC`;
    return code;
};
