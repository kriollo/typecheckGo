import { versaFetch } from '@/jscontrollers/composables/utils';
import { Proyecto } from './InjectKeys';

export const getStatusProyectos = async () => {
    const response = await versaFetch({
        url: '/api/proyectos/getStatusProyectos',
        method: 'GET',
    });
    return response;
};
export const changeEstadoProyecto = async (item: Proyecto, estado: number) => {
    const response = await versaFetch({
        url: '/api/proyectos/changeEstadoProyecto',
        method: 'POST',
        data: { proyecto: JSON.stringify(item), estado },
    });
    return response;
};
export const getHistorialProyecto = async (codigoproyecto: number) => {
    const response = await versaFetch({
        url: '/api/proyectos/getHistorialProyecto?codigoproyecto=' + codigoproyecto,
        method: 'GET',
    });
    return response;
};
