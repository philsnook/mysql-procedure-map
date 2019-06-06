const mysql = require('mysql');

class DatabaseClient{
    constructor(sqlConfig){
        this.sqlConfig = sqlConfig || {};
        this.sqlConfig.multipleStatements=true;
    }
    executeReader(query, parameters, callBack){
        try{
            var connection = mysql.createConnection(this.sqlConfig);
     
            connection.connect();

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
    
        return database.executeReader(query, parameters, function(err, tables, fields){

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

module.exports = DatabaseClient;