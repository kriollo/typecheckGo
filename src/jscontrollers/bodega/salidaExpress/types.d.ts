export type SalidaExpressItem = {
    id: number;
    descripcion: string;
    cod_campus: string;
    desc_campus: string;
    cod_area: string;
    desc_area: string;
    cod_centrogestion: string;
    desc_centrogestion: string;
    estado?: boolean;
    solicitante?: string;
};

export type Product = {
    codigo: string;
    descripcion: string;
    cod_bodega: string;
    desc_bodega: string;
    cod_tipocodigo: number;
    cantidad: number;
    valor: number;
};

export type FormularioEntrada = {
    cod_campus?: string;
    desc_campus?: string;
    cod_area?: string;
    desc_area?: string;
    cod_centrogestion?: string;
    desc_centrogestion?: string;
    solicitante?: string;
    jefatura?: string;
    observacion?: string;
};
