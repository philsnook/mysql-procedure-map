const mysql = require('mysql');
const fs = require('fs');
const path = require('path');

class Database {

    constructor (connectionConfig){
        this.connectionConfig=connectionConfig;

        if(this.connectionConfig==null){
            console.error("Missing connectionConfig as constructor parameter");
            return;
        }
        this.connectionConfig.multipleStatements=true;
    }

    generateJavascriptFile(filePath, callBack){
        this.generateJavascript(function(err, javascript){
            if(err){
                callBack(err);
                return;
            }

            fs.writeFile(filePath, javascript, function(err){
                callBack(err);
            });
        })
    }

    generateTypescriptFile(filePath, callBack){
        this.generateTypescript(function(err, typescript){
            if(err){
                callBack(err);
                return;
            }

            fs.writeFile(filePath, typescript, function(err){
                callBack(err);
            });
        })
    }

    generateJavascript(callBack){
        callBack = callBack || function(err){
            if(err){
                console.error(err);
            }
        };

        var javascriptOutput = '';
     
        var query = `
            SHOW PROCEDURE STATUS where db=DATABASE();
            SELECT * FROM information_schema.parameters  where ROUTINE_TYPE='PROCEDURE' and  SPECIFIC_SCHEMA=DATABASE() order by SPECIFIC_NAME, ORDINAL_POSITION;
        `;

        var generateProcedure = function(procedure, parameters, callBack){
            var paramNames = '';
            var outputParams ='';
        
             for(var n in parameters){
              var param = parameters[n];
              if(param.PARAMETER_MODE=='IN'){
                  if(paramNames.length>0){paramNames+=', ';};
                  paramNames+=(param.PARAMETER_NAME);
              };
             }
        
             for(var n in parameters){
              var param = parameters[n];
              if(param.PARAMETER_MODE=='OUT'){
                  if(outputParams.length>0){outputParams+=', ';};
                  outputParams+=(`'@${param.PARAMETER_NAME}'`);
              };
             }
        
             var functionParams = paramNames;
             if(functionParams.length>0){functionParams+=', ';};
             functionParams += 'callBack';
        
              var javascript = `     ${procedure.Name}(${functionParams}){
              this.db.executeProcedure('${procedure.Name}', [${paramNames}], [${outputParams}], function(err, tables, parameters){
                  if(callBack){
                    callBack(err, tables, parameters);
                  }
              });
          }`;
     
     
        var comments = '';
   
        for(var n in parameters){
            var param = parameters[n];
            if(param.PARAMETER_MODE=='IN'){
                if(comments.length>0){ comments = `${comments}\r\n`; }
                comments+=`    * @param {${param.DATA_TYPE}} ${param.PARAMETER_NAME} ${param.DTD_IDENTIFIER}`;
            };
        }
    
          javascript = `
          /** [${procedure.Name}] - auto generated procedure call\r\n${comments}
          * @param {Function} callBack(err, tables, parameters)
          */
        ${javascript}`;
              callBack(null, javascript);
        };

        this.executeQuery(query,[],function(err, results){

            if(err){
                callBack(err);
                return;
            }

            var procedures = results[0];
            var parameters = results[1];

            var popNextProcedure = function(){
                var proc = procedures[0];
                if(proc==null){
                    javascriptOutput = `
//auto generated procedure map
class Procedures {
    constructor(database){
        this.db = database;
    }
    ${javascriptOutput}
};
module.exports = Procedures;
`;
 

                    callBack(null, javascriptOutput);
                    return;
                }
                procedures.splice(0,1);

                var procedureParameters = [];

                for(var n in parameters){
                    var param = parameters[n];
                    if(proc.Name == param.SPECIFIC_NAME){
                        procedureParameters.push(param);
                    }
                }

                generateProcedure(proc, procedureParameters, function(err, javascript){
                    if(err){
                        callBack(err);
                        return;
                    }
                  
                    javascriptOutput+=javascript;
                    popNextProcedure();
                });
            };

            popNextProcedure();
        });
    }

    generateTypescript(callBack){
        callBack = callBack || function(err){
            if(err){
                console.error(err);
            }
        };

        var typescriptOutput = '';
        var typeDef = '';

        var query = `
            SHOW PROCEDURE STATUS where db=DATABASE();
            SELECT * FROM information_schema.parameters  where ROUTINE_TYPE='PROCEDURE' and  SPECIFIC_SCHEMA=DATABASE() order by SPECIFIC_NAME, ORDINAL_POSITION;
        `;


        var getCompatibleType = function(DATA_TYPE){
            var paramType = 'any';
            if(DATA_TYPE=='int' || DATA_TYPE=='float' || DATA_TYPE=='decimal'){
                paramType='number';
            }else if(DATA_TYPE=='bit'){
                paramType='number';
            }else if(DATA_TYPE=='tinyint'){
                paramType='number';
            }else if(DATA_TYPE=='varchar'){
                paramType='string';
            }else if(DATA_TYPE=='datetime'){
                    paramType='Date';
            }else{
                console.log(DATA_TYPE);
            }
            return paramType;
        };

        var generateProcedure = function(procedure, parameters, callBack){
            var paramNames = '';
            var typedParamNames = '';
            var outputParams ='';

            procedure.ShortName= '';
          
            var upperCaseNext = false;
            for(var c = 0; c < procedure.Name.length; c++){
                var char = procedure.Name[c];
                if(char=="_" && c==0){
                    upperCaseNext = true;
                }else{
                    if(c==0){
                        procedure.ShortName += char.toString().toUpperCase();
                    }else if (char=="_") {
                        upperCaseNext = true;      
                    }else{
                        if(upperCaseNext){
                            procedure.ShortName += char.toString().toUpperCase();
                            upperCaseNext=false;
                        }else{
                            procedure.ShortName += char;
                        }
                    }
                }
            }
          
             for(var n in parameters){
              var param = parameters[n];
              if(param.PARAMETER_MODE=='IN'){
                  if(paramNames.length>0){paramNames+=', ';};
                  if(typedParamNames.length>0){typedParamNames+=', ';};
                  paramNames+=param.PARAMETER_NAME;
                  typedParamNames+=`${param.PARAMETER_NAME}: ${getCompatibleType(param.DATA_TYPE)}`;
              };
             }
        
             var interfaceParams = '';

             for(var n in parameters){
              var param = parameters[n];
              if(param.PARAMETER_MODE=='OUT'){
                  if(outputParams.length>0){outputParams+=', ';};
                  outputParams+=(`"@${param.PARAMETER_NAME}"`);
                  interfaceParams += `
    ${param.PARAMETER_NAME}: ${getCompatibleType(param.DATA_TYPE)};`;
              };
             }

             var functionParams = typedParamNames;
             if(functionParams.length>0){functionParams+=', ';};
             functionParams += `callBack: ${procedure.ShortName}CallBack`;
        
             var callBackSignature;
             var callParams;

if(interfaceParams.length>0){
    callParams = 'err, tables, parameters';
    callBackSignature='callBack(err, tables, parameters);';

    typeDef += `export interface I${procedure.ShortName} {${interfaceParams}
}
export type ${procedure.ShortName}CallBack = (error: Error, tables: any[], parameters: I${procedure.ShortName}) => void;
`;
}else{
    callParams = 'err, tables';
    callBackSignature='callBack(err, tables);';
typeDef += `
export type ${procedure.ShortName}CallBack = (error: Error, tables: any[]) => void;
`; 
}      


              var typescript = `
    public ${procedure.Name}(${functionParams}) {
        this.database.executeProcedure("${procedure.Name}", [${paramNames}], [${outputParams}], (${callParams}) => {
            if (callBack) {
                ${callBackSignature}
            }
        });
    }
`;
     
     
      
              callBack(null, typescript);
        };

        this.executeQuery(query,[],function(err, results){

            if(err){
                callBack(err);
                return;
            }

            var procedures = results[0];
            var parameters = results[1];

            var popNextProcedure = function(){
                var proc = procedures[0];
                if(proc==null){
                    typescriptOutput = `
// Generated by mysql-procedure-map
export type ExecuteProcedureCallBack = (error: Error, tables: any[], parameters: any, fields: any[]) => void;

export interface IDatabase {
    executeProcedure(procedureName: string, parameters: any[], outputs: string[], callBack: ExecuteProcedureCallBack): void;
}
${typeDef}export class Procedures {
    public database: IDatabase;

    constructor(database: IDatabase) {
        this.database = database;
    }
${typescriptOutput}
}

export default Procedures;
`;
 

                    callBack(null, typescriptOutput);
                    return;
                }
                procedures.splice(0,1);

                var procedureParameters = [];

                for(var n in parameters){
                    var param = parameters[n];
                    if(proc.Name == param.SPECIFIC_NAME){
                        procedureParameters.push(param);
                    }
                }

                generateProcedure(proc, procedureParameters, function(err, typescript){
                    if(err){
                        callBack(err);
                        return;
                    }
                  
                    typescriptOutput+=typescript;
                    popNextProcedure();
                });
            };

            popNextProcedure();
        });
    }

    executeQuery(query, parameters, callBack){
        try{
            var connection = mysql.createConnection(this.connectionConfig);
     
            connection.connect();

            var preQuery = this.connectionConfig.preQuery || "";

            if(preQuery.length > 0){
                if(preQuery.endsWith(";")==false){
                    preQuery+=";";
                }
                query = preQuery + query;
            }

            connection.query(query, parameters, function (err, tables, fields) {
                try{
                    connection.end();
                }catch(ex){
                    callBack(ex);
                    return;
                }
    
                if(err){
                    callBack(err);
                    return;
                }

                if(fields && tables){
                    for(var f in tables){
                        if(fields[f]==null){
                            tables.splice(f,1);
                            fields.splice(f,1);             
                            break;
                        }
                    }
                }

                if(fields==null){
                    tables= [];
                }

                callBack(null, tables, fields);
            });
            
        }catch(ex){
            callBack(ex);
        }
    }

    executeProcedure(procedureName, parameters, outputs, callBack){

        parameters = parameters || [];
        outputs = outputs || [];
        
        var paramNames = '';
        for(var i in parameters){
            if(paramNames.length>0){ paramNames+=','; }
            paramNames+='?';
        }
        var paramSelect = '';
        for(var i in outputs){
            if(paramNames.length>0){ paramNames+=','; }
            paramNames+=outputs[i];
    
            if(paramSelect.length>0){ paramSelect+=','; }
            paramSelect+=outputs[i]
        }
    
        if(paramSelect.length>0){
            paramSelect = `SELECT ${paramSelect};`
        }
    
        var query = `CALL ${procedureName}(${paramNames});${paramSelect}`;
    
        return this.executeQuery(query, parameters, function(err, tables, fields){

            if(err){
                callBack(err);
                return;
            };
            
            var output = {};

            if(paramSelect.length>0){
                var outputFields = tables[tables.length-1][0];
                for(var n in outputFields){
                    output[n.replace('@','')]=outputFields[n];
                }
                tables.splice(tables.length-1,1);
            }
    
            callBack(err, tables, output, fields);
        });
    }
}

module.exports = {
    Database
};