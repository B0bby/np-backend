const express = require('express');
const request = require('request');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const MongoClient = require('mongodb').MongoClient;
const secrets = require('./secrets.js');
const bodyParser = require('body-parser');


const app = express();

MongoClient.connect('mongodb://' + secrets.mongo_username() + ':' + secrets.mongo_password() + '@' + secrets.mongo_url(), (err, database) => {
  if (err) return console.log(err)
  db = database
  app.listen(process.env.PORT || 3000, () => {
    console.log('App listening on 3000')
  })
})
 
app.set('view engine', 'pug');

app.use(express.static('views'));
app.use(cookieParser());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  
});
 
app.get('/admin', (req, res) => {
	res.render('admin');
});

app.post('/artists', (req, res) => {
  db.collection('artists').save(req.body, (err, result) => {
    if (err) return console.log(err)
    //console.log('Saved to database!')
    res.redirect('/')
  })
})

app.post('/playlists', (req, res) => {
  db.collection('playlists').save(req.body, (err, result) => {
    if (err) return console.log(err)
    //console.log('Saved to database!')
    res.redirect('/')
  })
})

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