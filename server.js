var express = require('express');
var request = require('request');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var secrets = require('./secrets.js');

var app = express();
app.set('view engine', 'pug');
app.set('views', './views');

app.get('/', (req, res) => {
  var sgOptions = {
    url: "https://api.seatgeek.com/2/events?geoip=true&per_page=500&datetime_utc.gte=2017-05-22&datetime_utc.lte=2017-05-29&taxonomies.name=concert&taxonomies.name=concerts&client_id=NzU1ODIxMXwxNDk0NTQ4NzY2Ljk2"
  }

  request.get(sgOptions, (error, result, body) => {
    var events = JSON.parse(body).events;
    getPrimaryArtistIds(events, renderPage, res);
  })
});

function getPrimaryArtistIds(events, callback, res) {
  var ids = [];
  events.map(function(e) {
    e.performers.forEach(function(p) {
      if (p.primary) {
        ids.push(p.id);
      }
    })
  });
  getArtistsTopTrack(ids, callback, res);
}

function getArtistsTopTrack(artists, callback, res) {
  artists.map((e) => {
    var paOptions = {
      url: "https://api.spotify.com/v1/artists/" + e +"/top-tracks",
      body: {
        country: "ISO 3166-2:US"
      }
    }
    console.log(paOptions.url);
    request.post(paOptions, (e, r, b) => {
      console.log(b);
      var artist = JSON.parse(b);

    })
  });

}

function renderPage(res, events) {
  res.send(events);
}

app.listen(3000);