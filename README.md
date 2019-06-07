# mysql-procedure-map

Automatically generate a script file housing all of the procedures in a given MySQL Database.

1. Connects to MySQL
2. Discovers a list of procedures and their parameters
3. Generates an output script detailing all the procedures in the database


# Setup a connection to the MySQL Database
```javascript

    const MySQL = require("mysql-procedure-map");

    const db = new MySQL.Database({
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
    db.generateProcedureMapFile("./procedures.js",function(err){
        if(err){
            console.error(err);
            return;
        }
        console.log('procedures.js generated from the MySQL Database');
    });
```

# Calling mapped procedures

```javascript
    //Require the generate script file.
    const Database = require("./procedures.js");

    //Create a new instance of the pre-generated script - Create the database connection as detailed above and pass it into new Procedures(database).
    const procedures = new Database.Procedures(database);

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