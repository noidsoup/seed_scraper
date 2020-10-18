require("dotenv").config();
const express = require("express");
//const mysql = require("mysql");
const cron = require("node-cron");
const path = require("path");
const csv = require("csvtojson");
const fastcsv = require("fast-csv");
const fs = require("fs");
const server = express();

var mysql = require('mysql2');
var url = require("url");
var SocksConnection = require('socksjs');
var remote_options = {
  host: process.env.HOST,
  port: 3306
};

var proxy = url.parse(process.env.QUOTAGUARDSTATIC_URL);
var auth = proxy.auth;
var username = auth.split(":")[0]
var pass = auth.split(":")[1]

var sock_options = {
  host: proxy.hostname,
  port: 1080,
  user: username,
  pass: pass
}

var sockConn = new SocksConnection(remote_options, sock_options);

server.use(express.static('csv'))
const port = process.env.PORT || 3000;
console.log(process.env.DB_USER);

const con = mysql.createConnection({
  database: process.env.DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  stream: sockConn
});

// https://support.quotaguard.com/support/solutions/articles/5000543888-accessing-a-mysql-database-via-a-static-ip-from-node-js-

con.on('error', function(err) {
  throw err;
});
console.log(process.env.HOST);

// forumlates a request sent to the database
const query = table => {
  return new Promise((resolve, reject) => {
    con.query(`SELECT * FROM ${table}`, (err, data, fields) => {
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
  });
};

const returnChildCategories = (ids, categories) => {
  const arr = [];
  ids.forEach((id) => {
    const category = categories.find(category => category.ID === id);
    if (!category || id === "0") return;
    arr.push(category.Category);
  })
  return arr;
};

const returnParentCategories = (ids, categories) => {
  const parentCategoryIds = [];
  const parentCategories = [];

  ids.forEach((id) => {
    const category = categories.find(category => category.ID === id);
    if (!category || id === "0") return;
    parentCategoryIds.push(category.Parent);
  })

  const unique = parentCategoryIds.filter((v, i, a) => a.indexOf(v) === i);

  unique.forEach((id) => {
    const category = categories.find(category => category.ID === id);
    if (!category || id === "0") return;
    parentCategories.push(category.Category);
  })

  return parentCategories;
};


const returnCategories = (item, categories) => {
  const categoryIds = [item.Category1, item.Category2, item.Category3, item.Category4, item.Category5];

  const childCategories = [...returnChildCategories(categoryIds, categories)];
  const parentCategories = [...returnParentCategories(categoryIds, categories)];

  return [...childCategories, ...parentCategories];
};

const returnVariations = (options, parentProduct) => {
  const result = options.find(option => option.ItemID === parentProduct.id);
  if (!result || !result.Attributes) return;

  const variations = [];

  result.Attributes.split('~').forEach((item, index) => {
    const quantityAndPrice = item.split(":");

    // child products don't need categories
    const childProduct = {
      title: parentProduct.title,
      // check with dad if this is indeed used to designate out of stock items
      active: parentProduct.active,
      parentProductId: parentProduct.id,
      id: `${parentProduct.id}-variation-${index}`,
      description: parentProduct.description,
      quantity: quantityAndPrice[0],
      price: quantityAndPrice[1],
    }

    variations.push(childProduct);
  });

  return variations;
};

const formatData = (items, options, categories) => {
  console.log("formatting data");

  const formattedData = [];

  items.forEach((item) => {
    const parentProduct = {
      id: item.ID,
      parentProductId: null,
      title: item.Item,
      categories: returnCategories(item, categories),
      description: item.Description,
      quantity: null,
      price: null,
      // condition ? exprIfTrue : exprIfFalse
      active: item.Active === "Yes" ? 'instock' : 'outofstock'
    };

    

    const variations = returnVariations(options, parentProduct);
    if (variations) {
      formattedData.push(parentProduct, ...variations);
    } else {
      formattedData.push(parentProduct);
    }
    
  });

  return formattedData;
};

// creates the csv for the two relevant tables in the remote database
const createCSV = async () => {
  await query("cactus__items");
  await query("cactus__options");
  await query("cactus__categories");

  const items = await csv().fromFile("csv/cactus__items.csv");
  const options = await csv().fromFile("csv/cactus__options.csv");
  const categories = await csv().fromFile("csv/cactus__categories.csv");

  const fake_items = [items[2], items[4000], items[611], items[27], items[84], items[3000]]

  const products = formatData(items, options, categories);

  fastcsv
    .write(products, { headers: true })
    .on("finish", function() {
      console.log(`Wrote to csv`);
/*       con.end(function(err) {
        if (err) {
          return console.log('error:' + err.message);
        }
        console.log('Closing the database connection.');
      }); */

    })
    .pipe(fs.createWriteStream(`csv/products.csv`));
};

server.get("/pull-database", (req, res) => {
  createCSV();
  res.send("created csv");
});

server.get('/get-products', (req, res) => {

  fs.readFile('./csv/products.csv', (err, json) => {
    if (err) throw err;
      let obj = JSON.parse(json);
      res.json(obj);
  });

});

// TODO: schedule tasks to be run on the server
cron.schedule('* * * * *', () => {
  console.log('running a task every minute');
});

// Starts the server
server.listen(port, () => {
  console.log("server started");
  createCSV();
});
