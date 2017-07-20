// Get local artists' top tracks

var express = require('express');
var request = require('request');
var dateFormat = require('dateformat');
var secrets = require('../secrets.js');
var fs = require('fs');

var router = express.Router();

var playlist = [];            // playlist contains information about the playlist
							  // TODO: get rid of playlist collections, just use Spotify to store this info

var artists = [];
var city;

var cityName = 'columbus';
var playlistBaseName = 'Local Lineup';
var startDate = '2017-07-24'; // needs to be in YYYY-MM-DD format
var endDate = '2017-07-30';   // needs to be in YYYY-MM-DD format
var prettyStartDate = dateFormat(removeTimeZoneUTC(startDate), 'm/d');
var prettyEndDate = dateFormat(removeTimeZoneUTC(endDate), 'm/d');

router.get('/', function(req, res) { 
	var ops;
	
	// Get city info
	ops = { url: 'http://localhost:3000/api/v1/cities/' + cityName };
	request.get(ops, (err, result, body) => {
		if (err) return console.log(err);
		city = JSON.parse(body);
		console.log('City done.');

		// get Seatgeek event / artist info
		ops = {
			url: 'http://localhost:3000/api/v1/seatgeek-events',
			json: {
				city: city,
				start_date: startDate,
				end_date: endDate
			}
		};	
		request.get(ops, (err, result, body) => {
			if (err) return console.log(err)
			artists = body;
			console.log('Seatgeek events and artists done.');
			
			// get Spotify artist info	
			// TODO: make this loop through the artists on the server side
			let requests = artists.reduce((promiseChain, artist) => {
				return promiseChain.then(() => new Promise((resolve) => {
					ops = {
						url: 'http://localhost:3000/api/v1/spotify-artists',
						json: { name: artist.seatgeek_artist.name }
					}
					request.get(ops, (err, result, body) => {
						if (err) return console.log(err)
						// JRL: I added this because it was pulling in some undefined artists 
						var spotifyArtist = body;
						if (spotifyArtist) {
							artists.find((a, i) => {
								if (a.event.id == artist.event.id) artists[i].spotify_artist = spotifyArtist;
							}); 
						}
						resolve();
					});
				}));
			}, Promise.resolve());  

			requests.then(() => {
				console.log('Spotify artists done.');
				// TODO: do stuff somewhere around here to flag artists as not needing songs?
				
				// get Spotify track info
				// TODO: make this loop through the artists on the server side
				let requests = artists.reduce((promiseChain, artist) => {
					return promiseChain.then(() => new Promise((resolve) => {
						if (artist.spotify_artist) {
							ops = {
								url: 'http://localhost:3000/api/v1/spotify-tracks',
								json: { artist_id: artist.spotify_artist.id }
							}
							request.get(ops, (err, result, body) => {
								if (err) return console.log(err)
								// JRL: I added this because it was pulling in some undefined tracks
								var track = body;
								if (track) {
									artists.find((a, i) => {
										if (a.event.id == artist.event.id) artists[i].top_track = track;
									});
								};
								resolve();
							});
						} else { resolve(); } // if seatgeek_artist does not have a matching spotify_artist
					}));
				}, Promise.resolve());

				requests.then(() => {	
					artists.forEach((a, i) => {
						if (!a.top_track) delete artists[i];
					});
					console.log('Top tracks done.');
					
					// create Spotify playlist
					var playlistName = playlistBaseName + ' ' + city.name + ' ' + prettyStartDate + '-' + prettyEndDate;
					ops = {
						url: 'http://localhost:3000/api/v1/spotify-playlists',
						json: { 'playlist_name': playlistName }
					}
					request.post(ops, (err, result, body) => {
						playlist = body; 
						artists.forEach((a, i) => {
							a.playlist_id = playlist.id;
						});

						console.log('Playlist done.');
						
						// add tracks to Spotify playlist
						var trackUris = [];
						artists.forEach((a) => {
							if (a.top_track) trackUris.push(a.top_track.uri);
						});

						var ops = {
							url: 'http://localhost:3000/api/v1/spotify-tracks',
							json: {
								'playlist_id': playlist.id,
								'track_uris': trackUris
							}
						}
						request.post(ops, (err, result, body) => {
							if (err) return console.log(err);
							console.log('Add tracks done.');
							
							// get Spotify playlist again (after tracks were added)
							// then add some extra details and save a Local Lineup playlist version
							ops = {
								url: 'http://localhost:3000/api/v1/spotify-playlists',
								json: { 'playlist_id': playlist.id }
							}
							request.get(ops, (err, result, body) => {
								playlist = body; 
								playlist.city = city.name.toLowerCase();
								playlist.start_date = prettyStartDate;
								playlist.end_date = prettyEndDate;

								ops = {
									url: 'http://localhost:3000/api/v1/playlists',
									json: playlist
								}
								request.post(ops, (err, result, body) => { 
									if (err) return console.log(err);

									console.log('Save playlist done.');
									
									// save all the Local Lineup artist information
									let requests = artists.reduce((promiseChain, artist) => {
										return promiseChain.then(() => new Promise((resolve) => {
											var ops = {
												url: 'http://localhost:3000/api/v1/artists',
												json: artist
											};

											request.post(ops, (err, result, body) => {
												if (err) return console.log(err)
												resolve();
											});
										}));
									}, Promise.resolve());  

									requests.then(() => {
								
										console.log('Save artists done.');
										res.json('http://localhost:3000/admin/playlists/' + playlist.id);		

									});
								});
							});	
						});
					});
				});
			});
		});
	});
});

function removeTimeZoneUTC(dateTime) {
	return new Date(dateTime).toUTCString().replace(/\s*(GMT|UTC)$/, '');
}

module.exports = router;