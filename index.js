require("dotenv").config();
const express = require("express");
const mysql = require('mysql');
const path = require('path');
const csv = require('csvtojson')
const fastcsv = require("fast-csv");
const fs = require("fs");

const server = express();
const port = process.env.PORT || 3000;

// DOE https://bezkoder.com/node-js-export-mysql-csv-file/ !!!
// serve static file https://expressjs.com/en/starter/static-files.html

var con = mysql.createConnection({
  host: "localhost",
  database : 'cactusst_db',
  user: "root",
  password: "admin"
});

const query = (table) => {
  return new Promise((resolve, reject) => {
    con.query(`SELECT * FROM ${table}`, function (err, data, fields) {
      if (err) throw err;
  
      const jsonData = JSON.parse(JSON.stringify(data));
      
      fastcsv
        .write(jsonData, { headers: true })
        .on("finish", function() {
          console.log(`Wrote to ${table}.csv`);
          resolve();
        })
        .pipe(fs.createWriteStream(`csv/${table}.csv`));
  
        
    });
  }) 
};

const formatData = (items, options) => {
  console.log("here's where the formatting happens");

/*   const formattedData = [];
  
  items.forEach(element => {
    console.log(element.ID);


    formattedData.push();
  }); */
};

const createCSV = async () => {
  await query("cactus__items");
  await query("cactus__options");

  const items = await csv().fromFile("csv/cactus__items.csv");
  const options = await csv().fromFile("csv/cactus__options.csv");
  formatData(items, options);
} 

server.get("/test", (req, res) => {
  res.send('it works!');
});

server.listen(port, () => {
  console.log("server started");
  createCSV();
});