# mysql-procedure-map

Maps a mysql database and generates a code file for all procedures in a given database

# Setup a connection to the MySQL Database
```javascript

    const MySQLDatabase = require("./mysql-procedure-bridge");

    const database = new MySQLDatabase({
        host    : 'localhost',
        user    : 'user',
        password: 'password',
        database: 'my_database'
    });
```

# Generate a procedure map source file.

```javascript
    //Create the database connection as detailed above.
    //Call generateProcedureMapFile with the output filename and callback function.
    database.generateProcedureMapFile("./output.js",function(err){
        if(err){
            console.error(err);
            return;
        }
        console.log('Output.js generated from the MySQL Database');
    });
```

# Calling mapped procedures

```javascript
    //Create the database connection as detailed above.
    //Require the generate script file.
    const Procedures = require("./output.js");

    //Create a new instance of the pre-generated script
    const procedures = new Procedures(database);

    //Call the on of the pre-generated procedures.
    procedures.sp_select_users(1,2,'hello',(err, tables, parameters)=>{
        if(err){
             console.error(`Error: ${err.message}`);
            return;
        }
        console.log(`Tables: ${tables.length}`);
        console.log(`Parameters: ${parameters}`);
    });

```