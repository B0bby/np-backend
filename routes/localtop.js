// Get local artists' top tracks
// #######################################################
// # NOTES TO BOB / JOEY
// #
// ######################################################

var express = require('express');
var request = require('request');
var secrets = require('../secrets.js');

var router = express.Router();

var events = [];
var tracks = [];
var names = [];
var ids = [];
var playlist = [];
var playlistBaseName = 'Music City Playlist';

router.get('/', function(req, res) {

  let eventPromise = new Promise((resolve, reject) => {
    getLocalEvents(resolve);
  });
  
  eventPromise.then(() => {
    distillNames();    
    let idPromise = new Promise((resolve, reject) => {
      getArtistIds(resolve);
    });
    
	  // JRL: We will need to refactor this to pull in the entire Artist eventually
	  //      For now, I left it as-is so that I didn't break anything.
	  idPromise.then(() => {
        let topTracksPromise = new Promise((resolve, reject) => {
        getTopTracks(resolve);
      });
      
      topTracksPromise.then(() => {
		let playlistPromise = new Promise((resolve, reject) => {
	      createPlaylist(resolve);
		});
		  
		playlistPromise.then(() => {
		  let addTracksPromise = new Promise((resolve, reject) => {
	        addTracks(resolve);
		  });
		  
	      addTracksPromise.then(() => {
			res.send(playlist);
          });

		});
      })
	  
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
	// JRL: I added this because it was pulling in some undefined tracks
	var track = JSON.parse(body).tracks[0] || null;
	if (track) {
		try{ tracks.push(track); }
		catch(e) {}
	}
    callback();
  })
  
}

function createPlaylist(callback){
  var ops = {
	 url: "https://api.spotify.com/v1/users/" + secrets.spotify_user_id() + "/playlists",
	 json: { "name": playlistBaseName, "public": false },
	 headers: { 'Authorization': 'Bearer ' + secrets.token(), 'Content-Type': 'application/json' },
	}
  request.post(ops, (err, res, body) => {
    playlist.push(body);
    callback();
  }) 
}


function addTracks(callback) {
  var trackUris = tracks.map((track) => {
	if (track) return track.uri;
  });

  var ops = {
	 url: "https://api.spotify.com/v1/users/" + secrets.spotify_user_id() + "/playlists/" + playlist[0].id + "/tracks",
	 json: { "uris": trackUris },
	 headers: { 'Authorization': 'Bearer ' + secrets.token(), 'Content-Type': 'application/json' },
	}
  request.post(ops, (err, res, body) => {
    callback();
  }) 
  
}

module.exports = router;