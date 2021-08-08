const mysql = require("mysql");
var colors = require("colors");

var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "notes",
});

connection.connect((err) => {
  if (err) {
    console.log(colors.red("Error conectando a la base de datos"));
    throw err;
  } else {
    console.log(
      colors.blue("Conectado a la base de datos de forma satisfactoria")
    );
  }
});


module.exports = {
  connection,
};