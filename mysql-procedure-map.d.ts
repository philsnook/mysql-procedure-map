declare module 'mysql-procedure-map';

export type ConnectionConfig =
    {
        host: String,
        user: String,
        password: String,
        database: String,
        preQuery?: String
    };

export type GenerateScriptCallBack = (error: Error, javascript:string, typescript: string) => void;
 
export type GenerateFileCallBack = (error: Error) => void;

export type ExecuteQueryCallBack = (error: Error, tables: any[], fields:any[]) => void;

export type ExecuteProcedureCallBack = (error: Error, tables: any[], parameters:any, fields:any[]) => void;
 
export class Database {
    constructor(connectionConfig: ConnectionConfig);

    connectionConfig: ConnectionConfig;

    generateJavascriptFile(filePath: string, callBack: GenerateFileCallBack): void;

    generateTypescriptFile(filePath: string, callBack: GenerateFileCallBack): void;

    generateJavascript(callBack: GenerateScriptCallBack): void;

    generateTypescript(callBack: GenerateScriptCallBack): void;

    executeQuery(query: string, parameters: string[], callBack: ExecuteQueryCallBack): void;

    executeProcedure(procedureName: string, parameters: string[], outputs: string[], callBack:ExecuteProcedureCallBack): void;

}
