import {Pool} from 'pg'

export function getPool({connString}){
    return {pool: new Pool({connectionString: connString}), msg: 'Connection established with DB'};
}

