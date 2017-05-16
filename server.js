const express = require('express');
const app = express();
// const server = require('http').createServer();
const path = require('path');
const RTM = require("satori-sdk-js");
const streamline = require('./lib/index.js');
const dotenv = require('dotenv');

dotenv.load()


//______________GET DATA____________________________________

// var endpoint1 = "wss://open-data.api.satori.com";
// var appKey = "A1FAF4aAb5637a603E53466cD2876778";
// var channel1 = "nyc-traffic-speed";
var endpoint = "wss://open-data.api.satori.com";
var appKey = "9BABD0370e2030dd5AFA3b1E35A9acBf";
var channelBike = "US-Bike-Sharing-Channel";
var channelTraffic = "nyc-traffic-speed";
var channelTV = "tv-commercial-airings";

let scatterData = [
  { Borough: 'Bronx', Lat: 40.8464305, Long: 73.93213, Speed: 20},
  { Borough: 'Staten Island', Lat: 40.6077805, Long: 74.14091, Speed: 20 },
  { Borough: 'Queens', Lat: 40.78795, Long: 73.790191, Speed: 20 },
  { Borough: 'Manhattan', Lat: 40.71141, Long: 73.97866, Speed: 20 },
  { Borough: 'Brooklyn', Lat: 40.61632, Long: 74.0263, Speed: 20 },
];
let lineData = [];
let barData = [];
let bubbleData = [];
let pieData = [];
let cacheTV = {};
let counterLine = 0;
let counterBubble = 0;

//-------------------------------------

var rtm = new RTM(endpoint, appKey);
rtm.on("enter-connected", function () {
  console.log("Connected to RTM!");
});

var subscriptionBike = rtm.subscribe(channelBike, RTM.SubscriptionMode.SIMPLE);
subscriptionBike.on('rtm/subscription/data', function (pdu) {
  pdu.body.messages.forEach(function (msg) {

    //line chart data
    if (msg.station_id < 300) {
      msg.counter = counterLine++;
      lineData.push(msg);

      if (lineData.length > 20) {
        lineData.shift();
      }
    }

    // bubble chart data 
    if (msg.station_id < 300) {
      msg.counter = counterBubble++;
      let idExists = false;
      
      for (let i = 0; i < bubbleData.length; i += 1) {
        if (bubbleData[i].station_id === msg.station_id) {
          bubbleData[i] = msg;
          idExists = true;
        }
      }

      if (!idExists) bubbleData.push(msg);
      if (bubbleData.length > 30) bubbleData.shift();
    };
  });
});

var subscriptionTraffic = rtm.subscribe(channelTraffic, RTM.SubscriptionMode.SIMPLE);
subscriptionTraffic.on('rtm/subscription/data', function (pdu) {
  pdu.body.messages.forEach(function (msg) {

    //bar data 
    let found = false;
    for (let i = 0; i < barData.length; i += 1) {
      if (barData[i].Borough === msg.Borough) {
        barData[i].Speed = (Number(barData[i].Speed) + Number(msg.Speed)) / 2;
        found = true;
      }
    }

    msg.Speed = Number(msg.Speed);
    if(!found) barData.push(msg);

    //scatter data 
    for (let i = 0; i < scatterData.length; i += 1) {
      if (scatterData[i].Borough === msg.Borough) {
        scatterData[i].Speed = (Number(scatterData[i].Speed) + Number(msg.Speed)) / 2;
        scatterData[i].Speed = msg.Speed;
      }
    }

  });
});

var subscriptionTV = rtm.subscribe(channelTV, RTM.SubscriptionMode.SIMPLE);
subscriptionTV.on('rtm/subscription/data', function (pdu) {
  pdu.body.messages.forEach(function (msg) {
      
      //pie chart 
      if (!cacheTV[msg.genre]) {
        cacheTV[msg.genre] = 1;
        msg.count = cacheTV[msg.genre];
      } else  {
          cacheTV[msg.genre] = cacheTV[msg.genre] + 1;
          msg.count = cacheTV[msg.genre];
       }

      if (pieData.length === 0) pieData.push(msg);

      let found = false;
      for (let i = 0; i < pieData.length; i++) {
        if (pieData[i].genre === msg.genre) {
          pieData[i] = msg;
          found = true;
          break;
        }
      }
      if (!found)  pieData.push(msg);
    
  })
  
});

rtm.start();



//____________________CONFIGURATION FILES___________________________________

let lineConfig = {
  setWidth: 700,
  setHeight: 500,
  shiftXAxis: true,
  xDomainUpper: 20,
  xDomainLower: 0,
  yDomainUpper: 40,
  yDomainLower: 0,
  xTicks: 10,
  yTicks: 10,
  xScale: 'counter',
  yScale: 'num_bikes_available',
  xLabel_text: '',
  yLabel_text: ''
};

let scatterConfig = {
  setWidth: 700,
  setHeight: 500,
  shiftXAxis: true,
  xDomainUpper: 40.85,
  xDomainLower: 40.60,
  yDomainUpper: 74.0,
  yDomainLower: 73.5,
  xTicks: 10,
  yTicks: 10,
  xScale: 'Lat',
  yScale: 'Long',
  volume: 'Speed',
  xLabel_text: '',
  yLabel_text: '',
  circle_text: 'Borough',
};

let wordCloudConfig = {
  colors: ['#FB3640', '#605F5E', '#1D3461', '#1F487E', '#247BA0'],
  colorDomain: [5, 10, 15, 20, 100],
  font: 'Source Sans Pro',
  fontSize: 40,
  padding: 10,
  rotate: 0,
  height: 600,
  width: 2000,
}

let barConfig = {
  setWidth: 800,
  setHeight: 400,
  shiftYAxis: true,
  xDomainUpper: 20,
  xDomainLower: 0,
  yDomainUpper: 40,
  yDomainLower: 0,
  xTicks: 10,
  yTicks: 50,
  xScale: 'Borough',
  volume: 'Speed',
  xLabel_text: 'x axis label',
  yLabel_text: 'y axis label',
  color: ['#DAF7A6', '#FFC300', '#FF5733', '#C70039', '#900C3F', '#581845'],
};

let bubbleConfig2 = {
  setWidth: 700,
  setHeight: 500,
  text: 'id',
  volume: 'randNum',
};

let bubbleConfig = {
  setWidth: 700,
  setHeight: 500,
  text: 'station_id',
  volume: 'num_bikes_available',
};

let pieConfig = {
  setWidth: 700,                   
  setHeight: 700,                  
  category: 'genre',//category to be show in pie slices
  count: 'count'
};

//---------------SEND CLIENT FILES-----------------------


  function sendFiles(app) {
    app.use(express.static(path.join(__dirname, 'client')));

    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'client/home-page.html'));
    });
    console.log('inside function')
  }


//---------------------------------CALL STREAMLINE FUNCTION------------------------------------

let myStream = new streamline(sendFiles, 3000);

myStream.connect((socket) => {
  
  myStream.line(socket, lineData, lineConfig);
  myStream.scatter(socket, scatterData, scatterConfig);
  myStream.wordCloud(socket, wordCloudConfig);
  myStream.bar(socket, barData, barConfig);
  myStream.bubbleGraph(socket, bubbleData, bubbleConfig);
  myStream.pie(socket, pieData, pieConfig);
});


// server.listen(process.env.PORT || 3000, () => console.log('SERVER RUNNING ON 3000'));