// Get local artists' top tracks

var express = require('express');
var request = require('request');
var dateFormat = require('dateformat');
var secrets = require('../secrets.js');

var router = express.Router();

var events = [];              // events contains all information (spotify_artist, top_track, etc)
var playlist = [];            // playlist contains information about the playlist

var latitude = '36.1627';     // Nashville latitutde/longitude
var longitude = '-86.7816';   // default range in Seatgeek query is 30 mi
var startDate = '2017-06-18'; // needs to be in YYYY-MM-DD format
var endDate = '2017-06-24';   // needs to be in YYYY-MM-DD format
var playlistBaseName = 'Music City Playlist';

router.get('/', function(req, res) { 

  let eventPromise = new Promise((resolve, reject) => {
    getLocalEvents(resolve);
  });
  
  eventPromise.then(() => {
	parseSeatgeekArtists();
    let spotifyArtistPromise = new Promise((resolve, reject) => {
      getSpotifyArtists(resolve);
    });
    
	  spotifyArtistPromise.then(() => {
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
				console.log('playlist', playlist);
				res.json(events);
            });

		});
      })
	  
    });

  });
});

function getLocalEvents(callback) {
  var seatgeekOptions = {
	// Note: default search radius around lat/lon is 30 mi - this should even hit Franklin, TN
	//       datetime_local format is YYYY-MM-DDTHH:MM:SS - startDate is 00:00:00 and endDate is 23:59:59
    url: "https://api.seatgeek.com/2/events?lat=" + latitude + "&lon=" + longitude + "&per_page=500&datetime_local.gte=" + startDate + "T00:00:00&datetime_local.lte=" + endDate + "T23:59:59&taxonomies.name=concert&taxonomies.name=concerts&client_id=" + secrets.seatgeek_client_id()
  }
  
  request.get(seatgeekOptions, (error, result, body) => {
    events = JSON.parse(body).events;
    callback();
  })
}

function getSpotifyArtists(callback) {
  let requests = events.reduce((promiseChain, event) => {
    return promiseChain.then(() => new Promise((resolve) => {
      getSpotifyArtist(event, resolve);
    }));
  }, Promise.resolve());  
  
  requests.then(() => {
    callback();
  })
}

function parseSeatgeekArtists() {
  events.forEach((e, i) => {
	  e.performers.forEach((p) => {
		if (p.primary) {
		  events[i].seatgeek_artist = p;
		  delete events[i].performers;
		}
	  });
  });
}

function getSpotifyArtist(event, callback) { 
  var ops = {
    url: "https://api.spotify.com/v1/search",
    qs: { q: event.seatgeek_artist.name, type: 'artist' },
    headers: { 'Authorization': 'Bearer ' + secrets.token() },
  }
  request.get(ops, (err, res, body) => { 
	// JRL: I added this because it was pulling in some undefined artists
	var artist = JSON.parse(body).artists.items[0] || null;
	if (artist) {
		events.find((e, i) => {
			if (e.id == event.id) events[i].spotify_artist = artist;
		}); 
	} 
    callback();
  })  
}

function getTopTracks(callback) {
  let requests = events.reduce((promiseChain, event) => {
    return promiseChain.then(() => new Promise((resolve) => {
      if (event.spotify_artist) { 
		getTopTrack(event, resolve);
	  } else { resolve(); }
    }));
  }, Promise.resolve());

  requests.then(() => {
    callback();
  });
}

function getTopTrack(event, callback) {
  var ops = {
	url: "https://api.spotify.com/v1/artists/" + event.spotify_artist.id +"/top-tracks?country=US",
	headers: { 'Authorization': 'Bearer ' + secrets.token() },
  }
  request.get(ops, (err, res, body) => {    
	// JRL: I added this because it was pulling in some undefined tracks
	var track = JSON.parse(body).tracks[0] || null;
	if (track) {
		events.find((e, i) => {
			if (e.id == event.id) events[i].top_track = track;
		});
	}
	callback();
  })
}

function createPlaylist(callback) {
  var playlistName = playlistBaseName + ' ' + dateFormat(startDate, 'm/d') + '-' + dateFormat(endDate, 'm/d');
  var ops = {
	 url: "https://api.spotify.com/v1/users/" + secrets.spotify_user_id() + "/playlists",
	 json: { "name": playlistName, "public": false },
	 headers: { 'Authorization': 'Bearer ' + secrets.token(), 'Content-Type': 'application/json' },
	}
  request.post(ops, (err, res, body) => {
    playlist = body;
    callback(); 
  }) 
}


function addTracks(callback) {
  var trackUris = [];
  events.forEach((event) => {
	if (event.top_track) trackUris.push(event.top_track.uri);
  });
  
  var ops = {
	 url: "https://api.spotify.com/v1/users/" + secrets.spotify_user_id() + "/playlists/" + playlist.id + "/tracks",
	 json: { "uris": trackUris },
	 headers: { 'Authorization': 'Bearer ' + secrets.token(), 'Content-Type': 'application/json' },
	}
  request.post(ops, (err, res, body) => {
    callback();
  }) 
   
}

module.exports = router;