declare module 'versaTypes' {
    type VersaParamsFetch = {
        url: string;
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        headers?: Record<string, string> | HeadersInit;
        data?: FormData | Record<string, any> | string;
        credentials?: 'omit' | 'same-origin' | 'include';
    };

    type VersaFetchResponse = {
        success: number;
        message: string;
        data?: any;
        errors?: any;
        id?: number;
        urls?: any;
        redirect?: string;
        turnos?: any;
        urlZip?: string;
        acciones?: any;
        marca?: any;
        disabled?: boolean;
        counts?: string;
        find?: string;
        forEach(item: any): any;
        encabezado?: any;
        detalle?: any;
        title?: string;
        message?: string;
        map(item: any): any;
        archivo?: any;
        name?: string;
        email?: string;
        perfil?: string;
        pagina_inicio?: string;
        rol?: number;
        campus?: any[];
        codigo?: string;
        descripcion?: string;
        encabezado?: any[];
        detalle?: any[];
        solicitud?: any[];
        OK?: boolean;
        NOK?: boolean;
        colspan?: any[];
        columns?: any[];
        meta: any;
        html?: string;
        id?: number;
        filter(item: any): any;
        bodega_o?: any[];
        title?: string;
        message?: string;
        newImagen?: string;
        perfil?: string | false;
        bodegas?: any[];
        estructura?: any[];
        bodega_d?: any[];
        porAprobar?: any[];
        porDespachar?: any[];
        valesSalida?: any[];
        Rechazadas?: any[];
        vales?: any[];
        result?: string;
        arreglo?: any[];
        contenidotabla?: anny[];
        codigo?: string;
        length?: number;
    };

    type SwalResult = {
        isConfirmed: boolean;
        value?: any;
    };

    type AccionData = {
        product?: any;
        accion: string;
        item?: GrupoItem;
        tipo?: string;
        data?: any;
        files?: any;
        field?: string;
        newData?: any;
        id?: number;
        primeraLinea?: boolean;
        from?: string;
        hoja?: string;
        estado?: string;
        estado_panel?: string;
        counts?: string;
        codigo?: string;
    };

    type actionsType = {
        [key: string]: () => void;
    };

    type file = {
        archivo: string;
        type: string;
        size: number;
        file: File;
    };

    type Archivo = {
        data: string[];
        files: file;
        hoja: string;
        primeraLinea: boolean;
    };

    type VersaAlertParams = {
        title?: string;
        message?: string;
        html?: string;
        type: 'success' | 'error' | 'warning' | 'info';
        AutoClose?: boolean;
        callback?: () => void;
    };

    export { AccionData, actionsType, Archivo, SwalResult, VersaAlertParams, VersaFetchResponse, VersaParamsFetch };
}
