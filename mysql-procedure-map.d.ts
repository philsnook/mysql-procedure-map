declare module 'mysql-procedure-map';

type IConnectionConfig =
    {
        host: String,
        user: String,
        password: String,
        database: String,
        preQuery: String
    };

type IProcedureMapCallBack = (error: Error) => void;
type IProcedureMapFileCallBack = (error: Error, script: String) => void;
type IExecuteQueryCallBack = (error: Error, tables: any[], fields:any[]) => void;
type IExecuteProcedureCallBack = (error: Error, tables: any[], parameters:any, fields:any[]) => void;

declare class MySQLDatabase {
    constructor(connectionConfig: IConnectionConfig);

    connectionConfig: IConnectionConfig;

    generateProcedureMapFile(filePath: string, callBack: IProcedureMapCallBack): void;

    generateProcedureMap(callBack: IProcedureMapFileCallBack): void;

    executeQuery(query: string, parameters: string[], callBack: IExecuteQueryCallBack): void;

    executeProcedure(procedureName: string, parameters: string[], outputs: string[], callBack:IExecuteProcedureCallBack): void;

}
