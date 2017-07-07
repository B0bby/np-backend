$(document).ready(function() {
    $('#playlists-table').DataTable({
		'paging': false,
		'searching': false,
		'info': false
	});
	
	/*
	$('.remove-button').click(function() {
		var object_id = $(this).closest('tr').attr('object-id');
		var playlist_id = $(this).closest('tr').attr('playlist-id');
		var track_id = $(this).closest('tr').attr('track-id');
		console.log(track_id);

		if (confirm('Are you sure you want to remove this artist?')) {
			fetch('../artists', {
				method: 'delete',
				headers: {
				  'Content-Type': 'application/json'
				},				
				body: JSON.stringify({
					'object_id': object_id,
					'playlist_id': playlist_id,
					'track_id': track_id
				})
			})
			.then((res, status) => {
				console.log('SUCCESS', res);
				$(this).closest('tr').remove();			
			});
		}
	});
	*/
});