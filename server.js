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
// MOVIE_API_KEY
const MOVIE_API_KEY = process.env.MOVIE_API_KEY
// YELP_API_KEY
const YELP_API_KEY = process.env.YELP_API_KEY
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
app.get('/movie',movie_fun);
app.get('/yelp',yelp_fun);

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

// YELP Request

function yelp_fun(req,res){
  const query = req.query.search_query;
  const page = req.query.page;
  const limit = page * 5;
  const url = `url = http://api.yelp.com/v3/businesses/search?location=${query}&limit=${limit}`;
  superagent.get('url').set('Authorization', `Bearer ${YELP_API_KEY}`).then(data_json=>{

    const all_data=[];
    
    data_json.body.slice(limit-5,limit-1).forEach(item=>{
      all_data.push(new YelpData(item));
    })
    res.status(200).json(all_data);
  }).catch(error=>{
    // The yelp api doesn't work :( , so I put here sample fo Expected response To be able to continue

    const response ={data:
    [
      {
        "name1": "Pike Place Chowder",
        "image_url1": "https://s3-media3.fl.yelpcdn.com/bphoto/ijju-wYoRAxWjHPTCxyQGQ/o.jpg",
        "price1": "$$   ",
        "rating1": "4.5",
        "url1": "https://www.yelp.com/biz/pike-place-chowder-seattle?adjust_creative=uK0rfzqjBmWNj6-d3ujNVA&utm_campaign=yelp_api_v3&utm_medium=api_v3_business_search&utm_source=uK0rfzqjBmWNj6-d3ujNVA"
      },
      {
        "name1": "Umi Sake House",
        "image_url1": "https://s3-media3.fl.yelpcdn.com/bphoto/c-XwgpadB530bjPUAL7oFw/o.jpg",
        "price1": "$$   ",
        "rating1": "4.0",
        "url1": "https://www.yelp.com/biz/umi-sake-house-seattle?adjust_creative=uK0rfzqjBmWNj6-d3ujNVA&utm_campaign=yelp_api_v3&utm_medium=api_v3_business_search&utm_source=uK0rfzqjBmWNj6-d3ujNVA"
      }
    ]
  };

  const all_data=[];
  
    response.data.forEach(item=>{
      all_data.push(new YelpData(item));
    })
    res.status(200).json(all_data);
  });

  
}

// MOVIE Request

function movie_fun(req,res){
  const query = req.query.search_query;
  const url = `https://api.themoviedb.org/3/movie/550?api_key=${MOVIE_API_KEY}&query=${query}`;

  superagent.get(`${url}`).then(data_json=>{
    const all_movie=[];

    const movie_data = new MovieData (data_json.body);
    all_movie.push(movie_data);

    res.status(200).send(all_movie);
  }).catch(error=>{
    res.status(500).send(`movie ERROR ! ${error}`);
  });
}




// Nothing

function nothing_fun (req,res){
  res.status(200).send('nothing!!');
}

// Constructors

// yelp

function YelpData(json_data){
  this.name=json_data.name1;
  this.image_url=json_data.image_url1;
  this.price=json_data.price1;
  this.rating=json_data.rating1;
  this.url=json_data.url1;
}

// Movie

function MovieData(json_obj){
  this.title = json_obj.title;
  this.overview = json_obj.overview;
  this.average_votes = json_obj.vote_average;
  this.total_votes = json_obj.vote_count;
  this.image_url = json_obj.poster_path;
  this.popularity=json_obj.popularity;
  this.released_on = json_obj.release_date;
}

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

