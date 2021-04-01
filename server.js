'use strict';
// env data
require('dotenv').config();
const PORT =process.env.PORT;

// https://www.nps.gov/
const GEO_CODE_API_KEY = process.env.GEO_CODE_API_KEY;
// https://www.weatherbit.io/
const API_KEY_WEATHER = process.env.API_KEY_WEATHER;
// https://my.locationiq.com/
const API_KEY_LOCATION = process.env.API_KEY_LOCATION;


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

app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/parks', parksHandler);
app.use('*', notFoundHandler);

// Handler functions
// location
function locationHandler(req, res) {
  city = req.query.city;
  const helper_url = `https://us1.locationiq.com/v1/search.php?key=${API_KEY_LOCATION}&city=${city}&format=json`;

  if(!city){
    res.status(404).send('No values entered');
  }else{
    superagent.get(helper_url).then(data=>{
      const city_data = new LocationData(data.body);

      city=city_data.search_query;
      lon=city_data.longitude;
      lat=city_data.latitude;

      res.status(200).send(city_data);
    }).catch(error=>{
      res.status(500).send(error);
    });
  }
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

// Constructors

// location
function LocationData(data_results){
  this.search_query = data_results[0].display_name.split(',')[0];
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

app.listen(PORT, () => console.log('hello-2'));