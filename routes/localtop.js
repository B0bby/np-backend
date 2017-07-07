// Get local artists' top tracks

var express = require('express');
var request = require('request');
var dateFormat = require('dateformat');
var secrets = require('../secrets.js');
var fs = require('fs');

var router = express.Router();

var artists = [];              // artists contains all information (spotify_artist, top_track, etc)
var playlist = [];            // playlist contains information about the playlist

var cities = [
	{ 
		name: 'Chicago',
		latitude: '41.8781',
		longitude: '-87.6298',
		playlistBaseName: 'Local Lineup Chicago'
	},
	{ 
		name: 'Indianapolis',
		latitude: '39.7684',
		longitude: '-86.1581',
		playlistBaseName: 'Local Lineup Indianapolis'
	},
	{ 
		name: 'Nashville',
		latitude: '36.1627',
		longitude: '-86.7816',
		playlistBaseName: 'Local Lineup Nashville'
	},
	{ 
		name: 'Columbus',
		latitude: '39.9612',
		longitude: '-82.9988',
		playlistBaseName: 'Local Lineup Columbus'
	}
];

var cityIndex = 3; // Nashville

var startDate = '2017-07-10'; // needs to be in YYYY-MM-DD format
var endDate = '2017-07-16';   // needs to be in YYYY-MM-DD format
var prettyStartDate = dateFormat(removeTimeZoneUTC(startDate), 'm/d');
var prettyEndDate = dateFormat(removeTimeZoneUTC(endDate), 'm/d');

router.get('/', function(req, res) { 

  let eventPromise = new Promise((resolve, reject) => {
    getLocalEvents(resolve);
  });
  
  eventPromise.then(() => {
	console.log('Events done.');
	parseSeatgeekArtists();
	console.log('Seatgeek artists done.');
    let spotifyArtistPromise = new Promise((resolve, reject) => {
      getSpotifyArtists(resolve);
    });
    
	  spotifyArtistPromise.then(() => {
	    console.log('Spotify artists done.');
        let topTracksPromise = new Promise((resolve, reject) => {
          getTopTracks(resolve);
        });
      
        topTracksPromise.then(() => {
		  artists.forEach((a, i) => {
			  if (!a.top_track) delete artists[i];
		  });
	      console.log('Top tracks done.');
		  let playlistPromise = new Promise((resolve, reject) => {
	        createPlaylist(resolve);
		  });
		  
		  playlistPromise.then(() => {
	        console.log('Playlist done.');
		    let addTracksPromise = new Promise((resolve, reject) => {
	          addTracks(resolve);
		    });
		  
	        addTracksPromise.then(() => {
			  console.log('Add tracks done.');
			  let savePlaylistPromise = new Promise((resolve, reject) => {
			    savePlaylist(resolve);
			  });
     	       
			   savePlaylistPromise.then(() => {
			     console.log('Save playlist done.');
			     let saveArtistsPromise = new Promise((resolve, reject) => {
			       saveArtists(resolve);
			     });
				 
			       saveArtistsPromise.then(() => {
			         console.log('Save artists done.');
				     res.send('http://localhost:3000/admin/playlists/' + playlist.id);		
			       });
				   
			   });

            });

		});
		
      })
	  
    });

  });
});


function saveArtists(callback) {
  let requests = artists.reduce((promiseChain, artist) => {
    return promiseChain.then(() => new Promise((resolve) => {
		var ops = {
			url: 'http://localhost:3000/artists',
			json: artist
		};
		
	  request.post(ops, (err, res, body) => {
		if (err) return console.log(err)
	    resolve();
	  });
    }));
  }, Promise.resolve());  
  
  requests.then(() => {
    callback();
  })
}

function savePlaylist(callback) {
  var ops = {
	 url: 'https://api.spotify.com/v1/users/' + secrets.spotify_user_id() + '/playlists/' + playlist.id,
	 headers: { 'Authorization': 'Bearer ' + secrets.token() }
	} 
	
  request.get(ops, (err, res, body) => {
    playlist = JSON.parse(body); 
	playlist.city = cities[cityIndex].name.toLowerCase();
	playlist.start_date = prettyStartDate;
	playlist.end_date = prettyEndDate;

	var ops = {
		url: 'http://localhost:3000/playlists',
		json: playlist
	};
  
	request.post(ops, (err, res, body) => { 
		if (err) return console.log(err)
		callback();
	});
  });
}

function getLocalEvents(callback) {
  var ops = {
	// Note: default search radius around lat/lon is 30 mi - this should even hit Franklin, TN
	//       datetime_local format is YYYY-MM-DDTHH:MM:SS - startDate is 00:00:00 and endDate is 23:59:59
    url: 'https://api.seatgeek.com/2/events?lat=' + cities[cityIndex].latitude + '&lon=' + cities[cityIndex].longitude + '&per_page=500&datetime_local.gte=' + startDate + 'T00:00:00&datetime_local.lte=' + endDate + 'T23:59:59&taxonomies.name=concert&taxonomies.name=concerts&client_id=' + secrets.seatgeek_client_id()
  }
  
  request.get(ops, (error, result, body) => {
    var events = JSON.parse(body).events;
	events.forEach((e, i) => {
		e.datetime_pretty = dateFormat(removeTimeZoneUTC(e.datetime_local), 'ddd, m/d htt');
		var event = { event: e };
		artists.push(event);
	});
    callback();
  })
}

function parseSeatgeekArtists() {
	artists.forEach((a, i) => {
	if (a.event.performers) {
		a.event.performers.forEach((p) => {
			if (p.primary) {
			  artists[i].seatgeek_artist = p;
			  delete artists[i].event.performers;
			}
		  });
	}
  });
}

function getSpotifyArtists(callback) {
  let requests = artists.reduce((promiseChain, artist) => {
    return promiseChain.then(() => new Promise((resolve) => {
      getSpotifyArtist(artist, resolve);
    }));
  }, Promise.resolve());  
  
  requests.then(() => {
    callback();
  })
}

function getSpotifyArtist(artist, callback) { 
  var ops = {
    url: 'https://api.spotify.com/v1/search',
    qs: { q: artist.seatgeek_artist.name, type: 'artist' },
    headers: { 'Authorization': 'Bearer ' + secrets.token() },
  }
  request.get(ops, (err, res, body) => {
	// JRL: I added this because it was pulling in some undefined artists 
	var spotifyArtist = JSON.parse(body).artists.items[0] || null;
	if (spotifyArtist) {
		artists.find((a, i) => {
			if (a.event.id == artist.event.id) artists[i].spotify_artist = spotifyArtist;
		}); 
	} 
    callback();
  })  
}

function getTopTracks(callback) {
  let requests = artists.reduce((promiseChain, artist) => {
    return promiseChain.then(() => new Promise((resolve) => {
      if (artist.spotify_artist) { 
		getTopTrack(artist, resolve);
	  } else { resolve(); }
    }));
  }, Promise.resolve());

  requests.then(() => {
    callback();
  });
}

function getTopTrack(artist, callback) {
  var ops = {
	url: 'https://api.spotify.com/v1/artists/' + artist.spotify_artist.id + '/top-tracks?country=US',
	headers: { 'Authorization': 'Bearer ' + secrets.token() },
  }
  request.get(ops, (err, res, body) => {    
	// JRL: I added this because it was pulling in some undefined tracks
	var track = JSON.parse(body).tracks[0] || null;
	if (track) {
		artists.find((a, i) => {
			if (a.event.id == artist.event.id) artists[i].top_track = track;
		});
	}
	callback();
  })
}

function createPlaylist(callback) {
  var playlistName = cities[cityIndex].playlistBaseName + ' ' + prettyStartDate + '-' + prettyEndDate;
  var ops = {
	 url: 'https://api.spotify.com/v1/users/' + secrets.spotify_user_id() + '/playlists',
	 json: { 'name': playlistName, 'public': false },
	 headers: { 'Authorization': 'Bearer ' + secrets.token(), 'Content-Type': 'application/json' },
	}
  request.post(ops, (err, res, body) => {
    playlist = body; 
	artists.forEach((a, i) => {
		a.playlist_id = playlist.id;
	});
    callback(); 
  }) 
}


function addTracks(callback) {
  var trackUris = [];
	artists.forEach((a) => {
	if (a.top_track) trackUris.push(a.top_track.uri);
  });
  
  var ops = {
	 url: 'https://api.spotify.com/v1/users/' + secrets.spotify_user_id() + '/playlists/' + playlist.id + '/tracks',
	 json: { 'uris': trackUris },
	 headers: { 'Authorization': 'Bearer ' + secrets.token(), 'Content-Type': 'application/json' },
	}
  request.post(ops, (err, res, body) => {
    callback();
  }) 
   
}

function removeTimeZoneUTC(dateTime) {
	return new Date(dateTime).toUTCString().replace(/\s*(GMT|UTC)$/, '');
}

module.exports = router;