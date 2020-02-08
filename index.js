require("dotenv").config();
const express = require("express");
const mysql = require('mysql');
const path = require('path');
const csv = require('csvtojson')
const fastcsv = require("fast-csv");
const fs = require("fs");

const server = express();
server.use(express.static('csv'))
const port = process.env.PORT || 3000;

// serve static file https://expressjs.com/en/starter/static-files.html

var con = mysql.createConnection({
  host: "localhost",
  database : 'cactusst_db',
  user: "root",
  password: "admin"
});

// forumlates a request sent to the database
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

const returnOption = (options, id) => {
  //console.log(options);
  const result = options.find(option => option.ItemID === id );
  //console.log(result);

  if (result) {
    return {
      optionAttribuets: result.Attributes,
    }
  } 
};

const formatData = (items, options) => {
  console.log("here's where the formatting happens");

  const formattedData = [];
  
  items.forEach(element => {
    //console.log(element.ID);
    const option = returnOption(options, element.ID);
    //console.log(option);
    formattedData.push({ ...element, ...option });
  });

  return formattedData;
};

// creates the csv for the two relevant tables in the remote database
const createCSV = async () => {
  await query("cactus__items");
  await query("cactus__options");

  const items = await csv().fromFile("csv/cactus__items.csv");
  const options = await csv().fromFile("csv/cactus__options.csv");
  
  const productList = formatData(items, options);

  fastcsv
    .write(productList, { headers: true })
    .on("finish", function() {
      console.log(`Wrote to csv`);
      //resolve();
    })
    .pipe(fs.createWriteStream(`csv/productList.csv`));
} 

server.get("/test", (req, res) => {
  res.send('it works!');
});

// Starts the server
server.listen(port, () => {
  console.log("server started");
  createCSV();
});