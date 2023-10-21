const mysql=require("mysql2")
const dotenv=require("dotenv")

dotenv.config()
const db = mysql.createConnection({
    host: 'localhost',
    port:3306,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
  });
  
  // Connect to the database
  db.connect(err => {
    if (err) {
      console.error('Error connecting to the database: ' + err.stack);
      return;
    }
    console.log('Connected to the database as id ' + db.threadId);
  });


  module.exports=db