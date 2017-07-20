$(document).ready(function() {
    $('#artists-table').DataTable({
		'paging': false,
		'searching': false,
//		'info': false
	});
	
	$('#create-campaign-button').click(function() {
		var object_id = $(this).closest('tr').attr('object-id');
		var playlist_id = $(this).closest('tr').attr('playlist-id');
		console.log('playlist-id', playlist_id);

		fetch('../../campaigns', {
			method: 'post',
			headers: {
			  'Content-Type': 'application/json'
			},				
			body: JSON.stringify({
				'object_id': object_id,
				'playlist_id': playlist_id
			})
		}).then((res, status) => {
			console.log('SUCCESS', res);
			// do jQuery stuff
		});
	});
	
	$('.remove-button').click(function() {
		var object_id = $(this).closest('tr').attr('object-id');
		var playlist_id = $(this).closest('tr').attr('playlist-id');
		var track_id = $(this).closest('tr').attr('track-id');
		console.log(object_id);

		if (confirm('Are you sure you want to remove this artist?')) {
			fetch('../../artists', {
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
} );