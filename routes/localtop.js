// Get local artists' top tracks

var express = require('express');
var request = require('request');
var secrets = require('../secrets.js');

var router = express.Router();

var events = [];
var tracks = [];
var names = [];
var ids = [];

router.get('/', function(req, res) {
  
  events = tracks = names = ids = [];
  
  let eventPromise = new Promise((resolve, reject) => {
    getLocalEvents(resolve);
  });
  
  eventPromise.then(() => {
    distillNames();    
    let idPromise = new Promise((resolve, reject) => {
      getArtistIds(resolve);
    });
    
    idPromise.then(() => {
      let trackPromise = new Promise((resolve, reject) => {
        getTopTracks(resolve);
      });
      
      trackPromise.then(() => {
        res.send(tracks);
      });
    });
  });
});


function getLocalEvents(callback){
  var seatGeekOptions = {
    url: "https://api.seatgeek.com/2/events?geoip=true&per_page=500&datetime_utc.gte=2017-05-22&datetime_utc.lte=2017-06-15&taxonomies.name=concert&taxonomies.name=concerts&client_id=NzU1ODIxMXwxNDk0NTQ4NzY2Ljk2"
  }  
  
  request.get(seatGeekOptions, (error, result, body) => {       
    events = JSON.parse(body).events;     
    callback();
  })
}

function distillNames(){
    events.map(function(e) {
      e.performers.forEach( (p) => {
        if (p.primary) {                    
          names.push(p.name);
        }
      })
    });    
}

function getArtistIds(callback){
  let requests = names.reduce((promiseChain, name) => {
    return promiseChain.then(() => new Promise((resolve) => {
      getId(name, resolve);
    }));
  }, Promise.resolve());  
  
  requests.then(() => {
    callback();
  })
}

function getId(name, callback){
  var ops = {
    url: "https://api.spotify.com/v1/search",
    qs: { q: name, type: 'artist' },
    headers: { 'Authorization': 'Bearer ' + secrets.token() },
  }
  request.get(ops, (err, res, body) => {
    var result = JSON.parse(body);
    try{ ids.push(result.artists.items[0].id); }
    catch(e) {}
    callback();
  })  
}

function getTopTracks(callback) {
  let requests = ids.reduce((promiseChain, id) => {
    return promiseChain.then(() => new Promise((resolve) => {
      getTopTrack(id, resolve);
    }));
  }, Promise.resolve());

  requests.then(() => {
    callback();
  });
}

function getTopTrack(id, callback){  
  var ops = {
    url: "https://api.spotify.com/v1/artists/" + id +"/top-tracks?country=US",
    headers: { 'Authorization': 'Bearer ' + secrets.token() },
  }
  request.get(ops, (err, res, body) => {    
    try{ tracks.push(JSON.parse(body).tracks[0]); }
    catch(e) {}
    callback();
  })
  
}

module.exports = router;