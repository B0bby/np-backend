const express = require('express');
const request = require('request');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const secrets = require('./secrets.js');
const bodyParser = require('body-parser');
const dateFormat = require('dateformat');


const app = express();

MongoClient.connect('mongodb://' + secrets.mongo_username() + ':' + secrets.mongo_password() + '@' + secrets.mongo_url(), (err, database) => {
  if (err) return console.log(err)
  db = database
  app.listen(process.env.PORT || 3000, () => { 
    console.log('App listening on 3000');
  })
})

app.set('view engine', 'pug');

app.use(express.static('views'));
app.use(cookieParser());
app.use(bodyParser.json({limit: '50mb'}));

// TODO: replace this with a home landing page and list of cities
// TODO: move localtop to the function for creating a new playlist from the /admin/city/playlists route
app.get('/', (req, res) => { 
});

// find the most recently created public playlist with the specified city from url
// NOTE: this is crashing the app for some reason
/*
app.get('/:city', (req, res) => {
  db.collection('playlists').findOne({ public: true, city: req.params.city }, { sort: {_id: -1} }, (err, playlist) => {
	if (err) return console.log(err);
      db.collection('artists').find({ playlist_id: playlist.id }).toArray((err, artists) => {
		if (err) return console.log(err);
		res.render('index', { playlist: playlist, artists: artists, city: toTitleCase(req.params.city) });		
	  });
    });
}); 
*/

// TODO: clean this up and put it in separate route files
app.get('/admin/cities/:city', (req, res) => {
  db.collection('playlists').find({ city: req.params.city.toLowerCase() }, { sort: {_id: -1} }).toArray((err, playlists) => {
	if (err) return console.log(err)
	res.render('playlists', { playlists: playlists, city: toTitleCase(req.params.city) });		
  });
}); 

app.get('/admin/playlists/:id', (req, res) => {
  request.get({ url: 'http://localhost:3000/api/v1/playlists/' + req.params.id }, (err, result, body) => {
	if (err) return console.log(err);
	var playlist = JSON.parse(body);
     request.get({ url: 'http://localhost:3000/api/v1/artists', json: { "playlist_id": req.params.id } }, (err, result, body) => {
		if (err) return console.log(err);
		var artists = body;
		res.render('artists', { playlist: playlist, artists: artists });		
	  });
    });
}); 
 



// THIS SHOULD GO INTO AN API ROUTE

// create Mailchimp campaign  
// TODO: maybe make this work better with Angular without making more API calls?
app.post('/campaigns', (req, res) => {
      request.get({ url: 'http://localhost:3000/api/v1/playlists/' + req.body.playlist_id }, (err, result, body) => {
    	var playlist = JSON.parse(body);

       request.get({ url: 'http://localhost:3000/api/v1/artists', json: { "playlist_id": req.body.playlist_id } }, (err, result, body) => {
			if (err) return console.log(err);
		    var artists = body;

		  request.get({ url: 'http://localhost:3000/api/v1/cities/' + playlist.city }, (err, result, body) => {
			var city = JSON.parse(body);
				var mailchimp_artists = [];

				artists.forEach((a, i) => {
					mailchimp_artists.push({
						'artist': (a.spotify_artist ? a.spotify_artist.name : ''),
						'venue': (a.event.venue.name || ''),
						'date': a.event.datetime_pretty,
						'ticket_link': '<a href="' + a.event.url  + '" target="_blank">Tickets' + (a.event.stats.lowest_price ? ' from $' + a.event.stats.lowest_price : '') + '</a>'
					});
				});
				
				// ##################################
				// create the campaign
				// TODO: create default schedule time based on start_date
				var ops = {
					url: 'https://us15.api.mailchimp.com/3.0/campaigns',
					headers: { 'Authorization': 'Basic ' + new Buffer('anystring:' + secrets.mailchimp_key()).toString('base64'), 'Content-Type': 'application/json' },
					json: {
						"recipients": {
							"list_id":"f7c946a5f4", // this is the Local Lineup list
							"segment_opts": {
								"saved_segment_id": city.mailchimp_segment_id
							}
						},
						"type":"regular",
						"settings":	{
							"subject_line": playlist.name, 
							"title": playlist.name,
							"from_name":"Local Lineup",
							"reply_to":"local-lineup@coderx.io",
							"folder_id": city.mailchimp_folder_id,
							"auto_footer": false,
							//"auto_fb_post": [ city.facebook_page_id ],
						},
						"social_card": { 
							"image_url": playlist.images[0].url,
							"description": "One song for each artist performing live in your city this week, delivered straight to your inbox. If you like a track, you know you can hear the artist live at a local venue in a couple of days. So sit back, relax, and discover new music from the comfort of your inbox -- then get out and see some shows!",
							"title": playlist.name
						}
					},
				}	
				request.post(ops, (err, campaign) => {
					if (err) return console.log(err)
						console.log(campaign.body.errors);
					
					// ##################################
					// update the campaign with template content
					var ops = {
						url: 'https://us15.api.mailchimp.com/3.0/campaigns/' + campaign.body.id + '/content',
						headers: { 'Authorization': 'Basic ' + new Buffer('anystring:' + secrets.mailchimp_key()).toString('base64'), 'Content-Type': 'application/json' },
						json: {
							"template": {
								"id": 64209, // this is the Local Linup Pilot template
								"sections": {
									"preheader_city": toTitleCase(playlist.city),
									"title_city": toTitleCase(playlist.city),
									"blurb_city": toTitleCase(playlist.city),
									"header_city": toTitleCase(playlist.city),
									"start_date": playlist.start_date,
									"end_date": playlist.end_date,
									"playlist_image": '<a href="' + playlist.external_urls.spotify + '" target="_blank"><img src="' + playlist.images[0].url + '" style="max-width:564px;" class="templateImage" mc:label="playlist_image" mc:allowdesigner="" mc:allowtext="" alt="playlist-image.png"></a>',
									"playlist_link": '<a id="playlist-link" style="color:#FFFFFF; text-decoration:none;" href="' + playlist.external_urls.spotify + '" target="_blank"><img src="https://gallery.mailchimp.com/2c6bf7155d6aeffd3c73e6ad6/images/93758508-1cbe-403e-ba3a-ba4b0a353b22.png" style="max-width:539px;" class="templateImage" mc:label="playlist_button_image" mc:allowdesigner="" mc:allowtext="" alt="Open Spotify Playlist"></a>',
									"website_link": '<a href="http://local-lineup.com/' + playlist.city + '" target="_blank">local-lineup.com/' + playlist.city + '</a>',
									"repeat_1": mailchimp_artists
								}
							}
						},
					}
					request.put(ops, (err, content) => {
						if (err) return console.log(err);
						db.collection('playlists').update({ _id: ObjectID(req.body.object_id) }, { $set: { "mailchimp_campaign_id": campaign.body.id } }, (err, result) => {
							if (err) return console.log(err);
							res.send(content);	
						});
					});
				});
			});
		});
	});
});

// ###################
// api: cities

 app.get('/api/v1/cities', (req, res) => {
  db.collection('cities').find().toArray((err, result) => {
	if (err) return console.log(err);
	res.json(result);		
  });
 });
 
  app.get('/api/v1/cities/:name', (req, res) => {
  db.collection('cities').findOne({ name_lower: req.params.name }, (err, result) => {
	if (err) return console.log(err);
	res.json(result);		
  });
 });


 // ###################
 // api: playlists
 
app.post('/api/v1/playlists', (req, res) => {
  db.collection('playlists').save(req.body, (err, result) => {
    if (err) return console.log(err);
	res.json(result);
  });
});

  app.get('/api/v1/playlists/:id', (req, res) => {
  db.collection('playlists').findOne({ id: req.params.id }, (err, result) => {
	if (err) return console.log(err)
	res.json(result);
  }); 
 });
 
  app.delete('/api/v1/playlists/:id', (req, res) => {
  db.collection('playlists').deleteOne({ id: req.params.id }, (err, result) => {
	if (err) return console.log(err)
	res.json(result);
  }); 
 });
 
 // ###################
 // api: artists
 
  app.get('/api/v1/artists', (req, res) => {
	  console.log(req.body.playlist_id);
  db.collection('artists').find({ playlist_id: req.body.playlist_id }).toArray((err, result) => {
	if (err) return console.log(err);
	res.json(result);		
  });
 });
 
 app.post('/api/v1/artists', (req, res) => {
	db.collection('artists').save(req.body, (err, result) => {
     if (err) return console.log(err) ;
 	res.json(result);
   });
 });
 
  app.delete('/api/v1/artists', (req, res) => {
  db.collection('artists').deleteMany({ playlist_id: req.body.playlist_id }, (err, result) => {
	if (err) return console.log(err)
	res.json(result);
  }); 
 });


// delete a row of artists from a playlist
// also needs to update the actual Spotify playlist
// TODO: maybe stop storing a local copy of the Spotify playlist?
app.delete('/artists', (req, res) => {
  db.collection('artists').findOneAndDelete({ _id: ObjectID(req.body.object_id) }, (err, result) => {
    if (err) return res.send(500, err);
	
	if (req.body.track_id) {
		var ops = {
		 url: 'https://api.spotify.com/v1/users/' + secrets.spotify_user_id() + '/playlists/' + req.body.playlist_id + '/tracks',
		 json: { 'tracks': [{ 'uri': req.body.track_id }] },
		 headers: { 'Authorization': 'Bearer ' + secrets.token(), 'Content-Type': 'application/json' },
		}
		request.delete(ops, (e, r, b) => {
		    // after deleting the track, we need to update our playlist tracks and mosaic images in the database
			// TODO/NOTE: if we stop storing a local copy of the Spotify playlist, we wouldn't have to do this
			var ops = {
			 url: 'https://api.spotify.com/v1/users/' + secrets.spotify_user_id() + '/playlists/' + req.body.playlist_id,
			 qs: { 'fields': 'images,tracks' },
			 headers: { 'Authorization': 'Bearer ' + secrets.token() } 
			} 
			
			request.get(ops, (e, r, b) => {
				var playlist = JSON.parse(b);
				db.collection('playlists').update({ id: req.body.playlist_id }, { $set: { images: playlist.images, tracks: playlist.tracks } }, (err, result) => {
				  if (err) return console.log(err) 
				  res.send(result);
				});

			});
		});
	} else {
		res.send(result);
	}    
  });
}); 

// ################
// api: seatgeek-events

app.get('/api/v1/seatgeek-events', (req, res) => {
  var city = req.body.city;
  var start_date = req.body.start_date;
  var end_date = req.body.end_date;
  var artists = [];
  
  var ops = {
	// Note: default search radius around lat/lon is 30 mi - this should even hit Franklin, TN
	//       datetime_local format is YYYY-MM-DDTHH:MM:SS - startDate is 00:00:00 and endDate is 23:59:59
    url: 'https://api.seatgeek.com/2/events?lat=' + city.latitude + '&lon=' + city.longitude + '&per_page=500&datetime_local.gte=' + start_date + 'T00:00:00&datetime_local.lte=' + end_date + 'T23:59:59&taxonomies.name=concert&taxonomies.name=concerts&client_id=' + secrets.seatgeek_client_id()
  }  
  request.get(ops, (err, result, body) => {
	if (err) return console.log(err);
    var events = JSON.parse(body).events;
	events.forEach((e, i) => {
		e.datetime_pretty = dateFormat(removeTimeZoneUTC(e.datetime_local), 'ddd, m/d htt');
		var event = { event: e };
		artists.push(event);
	});
	
	// pulls primary artists into separate seatgeek_artist array, and deletes performers object within events object
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
	
	res.json(artists);
  });
 	  
});

// #################
// api: spotify-artists

app.get('/api/v1/spotify-artists', (req, res) => {
	var ops = {
		url: 'https://api.spotify.com/v1/search',
		qs: { 
			q: req.body.name, 
			type: 'artist',
			limit: 1
		},
		headers: { 'Authorization': 'Bearer ' + secrets.token() }
	}
	request.get(ops, (err, result, body) => {
		if (err) return console.log(err);
		var artist = JSON.parse(body).artists.items[0] || null;
		res.json(artist); 
	});	
});

// #################
// api: spotify-tracks

app.get('/api/v1/spotify-tracks', (req, res) => {
	var ops = {
		url: 'https://api.spotify.com/v1/artists/' + req.body.artist_id + '/top-tracks?country=US',
		headers: { 'Authorization': 'Bearer ' + secrets.token() },
	}
	request.get(ops, (err, result, body) => {
		if (err) return console.log(err);
		var track = JSON.parse(body).tracks[0] || null;
		res.json(track);		
	});
});


app.post('/api/v1/spotify-tracks', (req, res) => {
	var ops = {
		url: 'https://api.spotify.com/v1/users/' + secrets.spotify_user_id() + '/playlists/' + req.body.playlist_id + '/tracks',
		json: { 'uris': req.body.track_uris },
		headers: { 'Authorization': 'Bearer ' + secrets.token(), 'Content-Type': 'application/json' },
	}
	request.post(ops, (err, result, body) => {
		res.json(body);
	});
});

// #################
// api: spotify-playlists

app.get('/api/v1/spotify-playlists', (req, res) => {
	var ops = {
		url: 'https://api.spotify.com/v1/users/' + secrets.spotify_user_id() + '/playlists/' + req.body.playlist_id,
		headers: { 'Authorization': 'Bearer ' + secrets.token() }
	}
	request.get(ops, (err, result, body) => {
		var playlist = JSON.parse(body);
		res.json(playlist);
	});
});

app.post('/api/v1/spotify-playlists', (req, res) => {
	var ops = {
		url: 'https://api.spotify.com/v1/users/' + secrets.spotify_user_id() + '/playlists',
		json: { 'name': req.body.playlist_name, 'public': false },
		headers: { 'Authorization': 'Bearer ' + secrets.token(), 'Content-Type': 'application/json' },
	}
	request.post(ops, (err, result, body) => {
		if (err) return console.log(err);
		var playlist = body;
		res.json(playlist);
	});
});

app.put('/api/v1/spotify-playlists/:id', (req, res) => {
	var ops = {
		url: 'https://api.spotify.com/v1/users/' + secrets.spotify_user_id() + '/playlists/' + req.params.id,
		json: { 'name': req.body.playlist_name, 'public': false },
		headers: { 'Authorization': 'Bearer ' + secrets.token(), 'Content-Type': 'application/json' },
	}
	request.post(ops, (err, result, body) => {
		if (err) return console.log(err);
		var playlist = body;
		res.json(playlist);
	});
});


app.delete('/api/v1/spotify-playlists/:id', (req, res) => {
	// change Spotify playlist ID to DELETED and make it not public, then unfollow playlist
	var ops = {
		url: 'http://localhost:3000/api/v1/spotify-playlists/' + req.params.id,
		json: { 'playlist_name': 'DELETED' }
	}
	request.put(ops, (err, result, body) => {
		if (err) return console.log(err);

		var ops = {
			url: 'https://api.spotify.com/v1/users/' + secrets.spotify_user_id() + '/playlists/' + req.params.id + '/followers',
			headers: { 'Authorization': 'Bearer ' + secrets.token(), 'Content-Type': 'application/json' },
		}
		request.post(ops, (err, result, body) => {
			if (err) return console.log(err);
			var playlist = body;
			res.json(playlist);
		});
	});
});


function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function removeTimeZoneUTC(dateTime) {
	return new Date(dateTime).toUTCString().replace(/\s*(GMT|UTC)$/, '');
}

var localtop = require('./routes/localtop.js');
app.use('/localtop', localtop);

var callback = require('./routes/callback.js');
app.use('/callback', callback);

var refresh_token = require('./routes/refresh_token.js');
app.use('/refresh_token', refresh_token);

var login = require('./routes/login.js');
app.use('/login', login);

// Not working as intended. Please ignore
var get_token = require('./routes/get_token.js');
app.use('/get_token', get_token);