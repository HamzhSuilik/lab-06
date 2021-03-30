'use strict';
// PORT
require('dotenv').config();
const PORT =process.env.PORT;
//const PORT =3000;
let all_data = [];

// connection
const express = require('express');
const cors = require('cors');


const app = express();
app.use(cors());

// location request
app.get('/location',(req,res)=>{
  const get_query= req.query.city;
  const data_json =require('./data/location.json');
  const location_1 = new Location_data(data_json[0],get_query);
  res.send(location_1);
});
// weather request
app.get('/weather',(req,res)=>{
  const data_json =require('./data/weather.json').data;
  
  data_json.forEach(element=>{
    all_data.push(new Weather_data(element));
  });

  res.send(all_data);
});

// constructors

function Location_data (json_object,query_name){
  this.search_query=query_name;
  this.formatted_query=json_object.display_name;
  this.latitude=json_object.lat;
  this.longitude=json_object.lon;
}

function Weather_data (json_object){
  this.forecast=json_object.weather.description;
  this.time=json_object.valid_date;
}

//default
app.use('*', (req, res) => {
  res.send('hello-1');
});
app.listen(PORT, () => console.log('hello-2'));