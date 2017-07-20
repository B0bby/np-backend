$(document).ready(function() {
    $('#playlists-table').DataTable({
		'paging': false,
		'searching': false,
		'info': false
	});
	
	$('#create-playlist').click(function() {
		var playlist = [];            // playlist contains information about the playlist
		var artists = [];
		var city = [];

		var cityName = 'nashville';
		var playlistBaseName = 'Local Lineup';
		
		var startDate = '2017-07-17'; // needs to be in YYYY-MM-DD format, TODO: make this a form field
		var endDate = '2017-07-23';   // needs to be in YYYY-MM-DD format, TODO: make this a form field
		var prettyStartDate = startDate;
		var prettyEndDate = endDate;
		
		var ops;
		
		// Get city info
		fetch('http://localhost:3000/api/v1/cities/' + cityName, {
			method: 'get'
		}).then(response => { return response.json(); }).then((result, status) => {
			console.log(result);
			//city = JSON.parse(body);
			console.log('City done.');
		});
/*
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
									};

									request.post(ops, (err, result, body) => { 
										if (err) return console.log(err);

										console.log('Save playlist done.');
										
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
											res.send('http://localhost:3000/admin/playlists/' + playlist.id);		

										});
									});
								});	
							});
						});
					});
				});
			});
		});
*/	
	});

	function removeTimeZoneUTC(dateTime) {
		return new Date(dateTime).toUTCString().replace(/\s*(GMT|UTC)$/, '');
	}		


	$('.remove-button').click(function() {
		var object_id = $(this).closest('tr').attr('object-id');
		var playlist_id = $(this).closest('tr').attr('playlist-id');
		var track_id = $(this).closest('tr').attr('track-id');
		console.log('playlist-id', playlist_id);

		if (confirm('Are you sure you want to remove this playlist?')) {
			fetch('http://localhost:3000/api/v1/spotify-playlists/' + playlist_id, {
				method: 'delete'
			})
			.then((res, status) => {
				fetch('http://localhost:3000/api/v1/playlists/' + playlist_id, {
					method: 'delete'
				})
				.then((res, status) => {				
					fetch('http://localhost:3000/api/v1/artists', {
						method: 'delete',
						headers: {
						  'Content-Type': 'application/json'
						},				
						body: JSON.stringify({
							'playlist_id': playlist_id
						})
					})
					.then((res, status) => {
						console.log('SUCCESS', res);
						$(this).closest('tr').remove();		
					});
				});
			});
		}
	});
	
});