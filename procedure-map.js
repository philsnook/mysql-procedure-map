

let procedureMap = {

    build:function(databaseClient, callBack){

        var procedureOutput = '';

        var query = `
            SHOW PROCEDURE STATUS where db=DATABASE();
            SELECT * FROM information_schema.parameters  where ROUTINE_TYPE='PROCEDURE' and  SPECIFIC_SCHEMA=DATABASE() order by SPECIFIC_NAME, ORDINAL_POSITION;
        `;

        databaseClient.executeReader(query,[],function(err, results){

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
    constructor(databaseClient){
        this.db = databaseClient;
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

                procedureMap.generateProcedure(proc, procedureParameters, function(err, output){
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
    },
    generateProcedure:function(procedure, parameters, callBack){

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
            callBack(err, tables, parameters);
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
    }

}

module.exports = procedureMap;