// Get local artists' top tracks

var request = require('request');

var events = [];
var tracks = [];
var names = [];
var ids = [];

var token = 'BQDYFZ3u_JgXDcmk3Xq3rQxqB7tOFikw7EYuEWLl--ldwsea52rIwezyk34TH_l9hLh9_M3Dhyg-n1MCy8b0bbuIwh2i8JXJmP9NsPC84NEYvOqPNz2tm7W-SqhWWw4Hcoc85C24xGsIzdF2PSu_AoUopHKCtGk';

function getLocalTop(res){
  
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
      })
    });
  })

  
}


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
    headers: { 'Authorization': 'Bearer ' + token },
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
    headers: { 'Authorization': 'Bearer ' + token },
  }
  request.get(ops, (err, res, body) => {    
    tracks.push(JSON.parse(body));
    callback();
  })
  
}

module.exports = {
  getLocalTop: getLocalTop
}