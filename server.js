var express = require('express');
var request = require('request');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var secrets = require('./secrets.js');

var localtop = require('./localtop.js');

var app = express();
// app.set('view engine', 'pug');
// app.use(express.static(__dirname + '/views'))
//    .use(cookieParser());

app.get('/', (req, res) => {  
  localtop.getLocalTop(res);
});

var callback = require('./routes/callback.js');
app.use('/callback', callback);

var refresh_token = require('./routes/refresh_token.js');
app.use('/refresh_token', refresh_token);

var login = require('./routes/login.js');
app.use('/login', login);

app.listen(3000);
console.log("App listening on port 3000");