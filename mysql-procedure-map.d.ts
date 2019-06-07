declare module 'mysql-procedure-map';

export type IConnectionConfig =
    {
        host: String,
        user: String,
        password: String,
        database: String,
        preQuery?: String
    };

export type IProcedureMapCallBack = (error: Error, script: String) => void;
export type IProcedureMapFileCallBack = (error: Error) => void;
export type IExecuteQueryCallBack = (error: Error, tables: any[], fields:any[]) => void;
export type IExecuteProcedureCallBack = (error: Error, tables: any[], parameters:any, fields:any[]) => void;
 
export class Database {
    constructor(connectionConfig: IConnectionConfig);

    connectionConfig: IConnectionConfig;

    generateProcedureMapFile(filePath: string, callBack: IProcedureMapCallBack): void;

    generateProcedureMap(callBack: IProcedureMapCallBack): void;

    executeQuery(query: string, parameters: string[], callBack: IExecuteQueryCallBack): void;

    executeProcedure(procedureName: string, parameters: string[], outputs: string[], callBack:IExecuteProcedureCallBack): void;

}
