var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var secrets = require('../secrets.js');
var router = express.Router();

router.get('/', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  console.log("REQ " + req);
  console.log("CODE " + req.query.code);
  
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[secrets.stateKey()] : null;
  
  if (state === null || state !== storedState) {
    res.send('State Mismatch');
  } else {
    res.clearCookie(secrets.stateKey());
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: secrets.redirect_uri(),
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(secrets.client_id() + ':' + secrets.client_secret()).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        // we can also pass the token to the browser to make requests from there
        res.send(access_token);
      } else {
        res.send('invalid_token');
      }
    });
  }
});

module.exports = router;
