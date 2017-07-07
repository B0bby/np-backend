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

app.get('/', (req, res) => { 
	// replace this with a home landing page and list of cities
	// move localtop to the function for creating a new playlist from the /admin/city/playlists route
});
 
app.get('/admin/:city/playlists', (req, res) => {
  db.collection('playlists').find({ city: req.params.city.toLowerCase() }, { sort: {_id: -1} }).toArray((err, playlists) => {
	if (err) return console.log(err)
	res.render('playlists', { playlists: playlists, city: toTitleCase(req.params.city) });		
  });
});

app.get('/admin/playlists/:id', (req, res) => {
  db.collection('playlists').findOne({ id: req.params.id }, (err, playlist) => {
	if (err) return console.log(err)
      db.collection('artists').find({ playlist_id: playlist.id }).toArray((err, artists) => {
		if (err) return console.log(err)
		res.render('artists', { playlist: playlist, artists: artists });		
	  });
    });
});

app.get('/admin/test', (req, res) => {

	res.send(dateFormat(new Date('2017-07-17').toUTCString().replace(/\s*(GMT|UTC)$/, ""), 'm/d'));

   
});

// create Mailchimp campaign  
// TODO: maybe make this work better with Angular without making more API calls?
app.post('/campaigns', (req, res) => {
	db.collection('playlists').findOne({ _id: ObjectID(req.body.object_id) }, (err, playlist) => {
		if (err) return console.log(err)

		db.collection('artists').find({ playlist_id: playlist.id }).toArray((err, artists) => {
			if (err) return console.log(err)

			var mailchimp_artists = [];

			artists.forEach((a, i) => {
				mailchimp_artists.push({
					'artist': (a.spotify_artist ? a.spotify_artist.name : ''),
					'venue': (a.event.venue.name || ''),
					'date': a.event.datetime_pretty,
					'ticket_link': '<a href="' + a.event.url  + '" target="_blank">Tickets' + (a.event.stats.lowest_price ? ' from $' + a.event.stats.lowest_price : '') + '</a>'
				});
			});

			var data = {
				"recipients": {
					"list_id":"f7c946a5f4",
					"segment_opts": {
						"saved_segment_id": 15177 // TODO: change this folder to an ID based on city
					},
				},
				"type":"regular",
				"settings":	{
					"subject_line": playlist.name, 
					"title": playlist.name,
					"from_name":"Local Lineup",
					"reply_to":"local-lineup@coderx.io",
					"folder_id": "b94744b6f3", // TODO: change this to folder ID based on city
					"auto_footer": false,
					"auto_fb_post": [ "1407306042694983" ], // TODO: change this to a dynamic FB page ID based on city
				},
				"social_card": { 
					"image_url": playlist.images[0].url,
					"description": "One song for each artist performing live in your city this week, delivered straight to your inbox. If you like a track, you know you can hear the artist live at a local venue in a couple of days. So sit back, relax, and discover new music from the comfort of your inbox -- then get out and see some shows!",
					"title": playlist.name
				}
			};

			var ops = {
				url: 'https://us15.api.mailchimp.com/3.0/campaigns',
				headers: { 'Authorization': 'Basic ' + new Buffer('anystring:' + secrets.mailchimp_key()).toString('base64'), 'Content-Type': 'application/json' },
				json: data,
			}			
			request.post(ops, (err, campaign) => {
				if (err) return console.log(err)

				console.log('campaign', campaign.body.errors);

				var data = {
					"template": {
						"id": 64209,
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
				};

				var ops = {
					url: 'https://us15.api.mailchimp.com/3.0/campaigns/' + campaign.body.id + '/content',
					headers: { 'Authorization': 'Basic ' + new Buffer('anystring:' + secrets.mailchimp_key()).toString('base64'), 'Content-Type': 'application/json' },
					json: data,
				}
				request.put(ops, (err, content) => {
					if (err) return console.log(err)
					db.collection('playlists').update({ _id: ObjectID(req.body.object_id) }, { $set: { "mailchimp_campaign_id": campaign.body.id } }, (err, result) => {
						if (err) return console.log(err)
						res.send(content);	
					});
				});
			});
		});
	});
});
 
// find the most recently created public playlist with the specified city from url
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

app.post('/artists', (req, res) => {
  db.collection('artists').save(req.body, (err, result) => {
    if (err) return console.log(err) 
	res.send(result);
  });
});

app.post('/playlists', (req, res) => {
  db.collection('playlists').save(req.body, (err, result) => {
    if (err) return console.log(err)
	res.send(result);
  });
});

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

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
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