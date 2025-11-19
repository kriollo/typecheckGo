import createInjection from '@/jscontrollers/composables/injectStrict';

export interface ShowModalForm {
    value: boolean;
    setShowModal: (value: boolean) => void;
    proyecto?: Proyecto;
    setProyecto?: (proyecto: Proyecto) => void;
    refreshTable?: boolean;
    fileProyecto?: FileProyecto;
    setFileProyecto?: (fileProyecto: FileProyecto) => void;
}

export interface FileProyecto {
    tipoarchivo: string;
    archivo: string;
    ruta: string;
    type: string;
    token: string;
    file?: File | null;
}

export interface Proyecto {
    anno: number;
    codigoproyecto: number | string;
    descripcion: string;
    observacion: string;
    codigocampus: number;
    desc_campus?: string;
    codigoarea: number;
    desc_area?: string;
    codigocentrogestion: number;
    desc_centrogestion?: string;
    monto: number;
    estado: number;
    id_user: number;
    tipo_proyecto: string;
    estado_aprobacion?: number;
    fecha_aprobacion?: string;
    corresponde_a?: string;
}

export interface ProyectoReactive {
    value: Proyecto;
}

export interface FileProyectoReactive {
    value: FileProyecto;
}

export const newProyecto: Proyecto = {
    anno: 2026,
    codigoproyecto: '',
    descripcion: '',
    observacion: '',
    codigocampus: 0,
    desc_campus: '',
    codigoarea: 0,
    desc_area: '',
    codigocentrogestion: 0,
    desc_centrogestion: '',
    monto: 0,
    estado: 1,
    id_user: 0,
    tipo_proyecto: '',
    corresponde_a: '',
};

export const newFileProyecto: FileProyecto = {
    tipoarchivo: '',
    archivo: '',
    ruta: '',
    type: '',
    token: '',
    file: null,
};

export const ShowModalFormInjection = createInjection<ShowModalForm>('ShowModalForm');

export const CORRESPONDE_A = [
    'Compra o Adquisición',
    'Habilitación Infraestructura o Mejoras Físicas',
    'Mantenimiento o Reparación',
    'Desarrollo o Innovación Tecnológica o Softwares.',
    'Servicios Profesionales o Técnicos.',
]