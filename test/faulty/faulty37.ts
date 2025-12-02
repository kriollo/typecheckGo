export class Utils {
    static sum(arr: number[]): number {  // ← Método ESTÁTICO
        return arr.reduce((a,b)=>a+b,0);
    }
}

var u = new Utils();  // ← ERROR: No deberías instanciar
