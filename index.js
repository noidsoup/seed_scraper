require("dotenv").config();
const express = require("express");
const mysql = require('mysql');

const server = express();
const port = process.env.PORT || 3000;

var con = mysql.createConnection({
  host: "localhost",
  database : 'cactusst_db',
  user: "root",
  password: "admin"
});

/* con.connect(function(err) {
  if (err) throw err;

  con.query("SELECT * FROM cactus__items where ID=1096", function (err, result, fields) {
    if (err) throw err;
    console.log(result);
  });
}); */

server.get("/test", (req, res) => {
  res.send('it works!');
});

server.listen(port, () => {
  console.log("werks");
});