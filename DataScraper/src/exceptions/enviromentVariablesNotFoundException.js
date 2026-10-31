export class EnviromentVariablesNotFoundException extends Error{

    constructor({ statusCode = 500, code = 'INTERNAL_ERROR' } = {}) {
        super("Enviroment Variables Not Found")
        this.name = this.constructor.name
        this.statusCode = statusCode
        this.code = code
    }
}