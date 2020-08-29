const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const fetch = require("node-fetch");
var moment = require('moment');
const _ = require('underscore');

require('dotenv').config();

// create application/json parser
var jsonParser = bodyParser.json();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* POST request to home page gets JSON body */
router.post('/', jsonParser, function(req, res) {
  let startDate = req.body.dateStart;
  let endDate = req.body.dateEnd;
  let distance = req.body.within.value;

  startDate = moment(startDate, "YYYY-MM-DD");
  endDate = moment(endDate, "YYYY-MM-DD");

  async function getPages() {
    const baseUrl = `http://www.neowsapp.com/rest/v1/neo/browse`;
    // 1221 pages total...takes ~.6 seconds to process each element and there are
    // 24410 elements total across all pages, so it would take ~14,646 seconds = ~244 minutes = ~4 hours
    let totalPages = 1221;
    // for testing purposes, we are only looping through the last 10 pages of results
    let page = totalPages - 10; 
    let limitPerPage = 20;
    let neos = [];
    let lastResult = [];

    let date = "";
    let missedDistance = "";
    let dateInRange = "";
    let distanceInRange = "";

    do {
      try {
        const resp = await fetch(`${baseUrl}?page=${page}&size=${limitPerPage}&api_key=${process.env.API_KEY}`);
        const data = await resp.json();
        if (data['links'].hasOwnProperty('next')) {
          lastResult = data['links']['next'];
        } else {
          lastResult = null;
        }

        if (data['near_earth_objects'].length > 0) {
          for (var i = 0; i < data['near_earth_objects'].length; i++) {
            let name = data['near_earth_objects'][i]['name'];
            if (Object.keys(data['near_earth_objects'][i]['close_approach_data']).length > 0) {
              for (var j = 0; j < Object.keys(data['near_earth_objects'][i]['close_approach_data']).length; j++) {
                date = moment(data['near_earth_objects'][i]['close_approach_data'][j]['close_approach_date'], "YYYY-MM-DD");
                missedDistance = Math.round(data['near_earth_objects'][i]['close_approach_data'][j]['miss_distance']['miles']);
                dateInRange = moment(date).isBetween(startDate, endDate);
                distanceInRange = missedDistance <= distance;
              }
            }
            if (dateInRange == true && distanceInRange == true) {
              neos.push(name);
            }
          }
        } 

        page++;
      } catch (err) {
        console.error(`Oops, something is wrong: ${err}`);
        res.send({ "error": true, "message": err });
      }
    } while (lastResult != null);

    if (neos.length < 1) {
      res.send({ "asteroids": [] });
    } else {
      res.send({ "asteroids": neos });
    }
  }
  
  console.time("Time my API call");
  getPages();
  console.timeEnd("Time my API call");
});

module.exports = router;
