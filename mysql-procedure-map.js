const mysql = require('mysql');
const fs = require('fs');

class Database {

    constructor (connectionConfig){
        this.connectionConfig=connectionConfig;

        if(this.connectionConfig==null){
            console.error("Missing connectionConfig as constructor parameter");
            return;
        }
        this.connectionConfig.multipleStatements=true;
    }

    generateProcedureMapFile(filePath, callBack){
        this.generateProcedureMap(function(err, script){
            if(err){
                callBack(err);
                return;
            }
            fs.writeFile(filePath,script, function(err){
                callBack(err);
            });
        })
    }

    generateProcedureMap(callBack){
        callBack = callBack || function(err){
            if(err){
                console.error(err);
            }
        };

        var procedureOutput = '';

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
        
              var output = `     ${procedure.Name}(${functionParams}){
              this.db.executeProcedure('${procedure.Name}', [${paramNames}], [${outputParams}], function(err, tables, parameters){
                  if(callBack){
                    callBack(err, tables, parameters);
                    return;
                  }else{
                      console.warn('No callBack defined for the procedure call: ${procedure.Name}');
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
        
          output = `
          /** [${procedure.Name}] - auto generated procedure call\r\n${comments}
          * @param {Function} callBack(err, tables, parameters)
          */
        ${output}`;
              callBack(null, output);
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
                    procedureOutput = `
//auto generated procedure map
class Procedures {
    constructor(database){
        this.db = database;
    }
    ${procedureOutput}
};
module.exports = Procedures;
`;
                    callBack(null, procedureOutput);
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

                generateProcedure(proc, procedureParameters, function(err, output){
                    if(err){
                        callBack(err);
                        return;
                    }
                  
                    procedureOutput+=output;
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