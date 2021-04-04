'use strict';
// env data
require('dotenv').config();


//---------------------- Env var -------------------------------
// Port
const PORT =process.env.PORT;
// https://www.nps.gov/
const GEO_CODE_API_KEY = process.env.GEO_CODE_API_KEY;
// https://www.weatherbit.io/
const API_KEY_WEATHER = process.env.API_KEY_WEATHER;
// https://my.locationiq.com/
const API_KEY_LOCATION = process.env.API_KEY_LOCATION;
// DataBase Url
const DATABASE_URL=process.env.DATABASE_URL;
//------------------------------------------------------------

// DataBase connection
const pg=require('pg');
const client = new pg.Client(DATABASE_URL);


let all_data = [];
// Save city data

// for test
// let city = 'usa';
// let lon = '35.9239625';
// let lat = '30.9515694';
let city = '';
let lon = '';
let lat = '';


// connection
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const app = express();
app.use(cors());

// Expected requests

app.get('/', nothing_fun);
app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/parks', parksHandler);

app.use('*', notFoundHandler);

// Handler functions
// location

function locationHandler(req, res) {
  city = req.query.city;
  if(!city){
    res.status(404).send('No values entered');
  }else{
    creat_table(city,res);
  }
}

function creat_table(city,res){
  const sqlQuery =`CREATE TABLE IF NOT EXISTS details (search_query TEXT,formatted_query TEXT,latitude TEXT,longitude TEXT);`;
  client.query(sqlQuery).then(
    check_city(city,res)
  ).catch(error => {
    console.log(error);
    res.status(500).send('Internal server error - IN SQL DB');
  });
}

function check_city(city,res){
  const sqlQuery =`SELECT * FROM details;`;
  client.query(sqlQuery).then(result => {
    //res.status(200).send(result.rows);
    let check = false;
    let old_data;
    result.rows.forEach(item=>{
      if(item.search_query==city){
        old_data=item;
        check=true;
      }
    })
    if(check){
      old_city(old_data,res)
    }else{
      get_data_from_api(city,res)
    }
    
  }).catch(error => {
    console.log(error);
    res.status(500).send('error - when select tables data');
  });
}

function old_city(city_data,res){
      // save city data
      city=city_data.search_query;
      lon=city_data.longitude;
      lat=city_data.latitude;

  res.status(200).json(city_data);
}


function get_data_from_api(city,res){
  const helper_url = `https://us1.locationiq.com/v1/search.php?key=${API_KEY_LOCATION}&city=${city}&format=json`;
  superagent.get(helper_url).then(data=>{
    const city_data = new LocationData(data.body,city);

    // save city data
    city=city_data.search_query;
    lon=city_data.longitude;
    lat=city_data.latitude;

    save_new_city_in_database(city_data,res)
  }).catch(error=>{
    res.status(500).send(error);
  })
}

function save_new_city_in_database(city_data,res){
  const safeValues = [city_data.search_query,city_data.formatted_query,city_data.latitude,city_data.longitude];
  const sqlQuery = `INSERT INTO details(search_query,formatted_query,latitude,longitude) VALUES( $1, $2, $3, $4 )`;
  

  client.query(sqlQuery,safeValues).then(result=>{
    res.status(200).json(city_data)
  }).catch(error=>{
    res.status(500).send('error--->*');
  })
}


// weather
function weatherHandler(req, res) {
  if(!city){
    res.status(404).send('No value entered');
  }else{
    const helper_url = `https://api.weatherbit.io/v2.0/forecast/daily?key=${API_KEY_WEATHER}&lat=${lat}&lon=${lon}`;
    //  https://api.weatherbit.io/v2.0/forecast/daily?key=6313ce263087429f92ed87713460c9a0&lon=35.9239625&lat=31.9515694
    
    superagent.get(helper_url).then(weather_json=>{
      let weatherData = [];

      weather_json.body.data.map(details => {
        weatherData.push(new WeatherData(details));
      });
   
      res.status(200).send(weatherData);
    }).catch(error=>{
      res.status(500).send(error);
    });
  }
}

// parks
function parksHandler(req, res) {
  const helper_url = `https://developer.nps.gov/api/v1/parks?api_key=${GEO_CODE_API_KEY}&q=${city}`;
  if(!city){
    res.status(404).send('No value entered');
  }else{
    superagent.get(helper_url).then(parks_json=>{
     
      let parksData = [];

      parks_json.body.data.map(details => {
        parksData.push(new ParksData(details));
      });
   
      res.status(200).send(parksData);
    }).catch(error=>{
      res.status(500).send(error);
    });
  }
}

// Nothing

function nothing_fun (req,res){
  res.status(200).send('nothing!!');
}

// Constructors

// location
function LocationData(data_results,search_query){
  this.search_query = search_query;
  this.formatted_query = data_results[0].display_name;
  this.latitude = data_results[0].lat;
  this.longitude = data_results[0].lon;
};
// weather
function WeatherData(weather_array){
  this.forecast=weather_array.weather.description;
  this.time=weather_array.valid_date;
};

// Parks
function ParksData(data){
  this.name=data.fullName;
  this.address=data.latLong;
  this.fee=data.entranceFees[0].cost;
  this.description=data.description;
  this.url=data.url;
};

//error handler
function notFoundHandler(req, res) {
  res.status(404).send('you sent Invalid request!!');
}
// open Server Port
// open Database Port before

client.connect().then(()=>{
  app.listen(PORT, () =>{
    console.log("Connected to database:", client.connectionParameters.database); //show what database we connected to
    console.log('DataBase & server are ready');
  });
});

