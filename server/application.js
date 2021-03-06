'use strict';

var express = require('express');
var path = require('path');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var compression = require('compression');
var favicon = require('serve-favicon');
var config = require('./config');

var app = express();

if (config.env === 'development') {
  var connectLivereload = require('connect-livereload');
  app.use(connectLivereload({ port: process.env.LIVERELOAD_PORT || 35729 }));
  app.use(morgan('dev'));
  app.use(express.static(config.public));
  app.use(express.static(path.join(__dirname, '../app')));
}
if (config.env === 'production') {
  app.use(morgan('default'));
  app.use(favicon(path.join(config.public, 'favicon.ico')));
  app.use(express.static(config.public));
  app.use(compression());
}
app.use(bodyParser.json());
app.use(methodOverride());


var models = require('./models'),
    User = models.User,
    Post = models.Post;

var admit = require('admit-one')('bookshelf', {
  bookshelf: { modelClass: User }
});

var api = express.Router();

api.post('/users', admit.create, function(req, res) {
  // user accessible via req.auth.user
  res.json({ user: req.auth.user });
});

api.post('/sessions', admit.authenticate, function(req, res) {
  // user accessible via req.auth.user
  res.json({ session: req.auth.user });
});

api.get('/posts', function(req, res){
  Post.fetchAll({ withRelated: 'user' })
  .then(function(collection) {
    var users = [];
    var posts = collection.toJSON().map(function(model) {
      delete model.user.passwordDigest;
      users.push(model.user);
      model.user = model.userID;
      delete model.userID;
      return model;
    });
    res.json({posts: posts, users: users });
  }).done();
});

// all routes defined below this line will require authorization
api.use(admit.authorize);
api.delete('/sessions/current', admit.invalidate, function(req, res) {
  if (req.auth.user) { throw new Error('Session not invalidated.'); }
  res.json({ status: 'ok' });
});

api.post('/posts', function(req, res){
  var user = req.auth.db.user;
  console.log(user.get('id'));
  res.json({});
  //TODO: write about some stuff
});

// application routes
app.use('/api', api);

// expose app
module.exports = app;

// start server
if (require.main === module) {
  app.listen(config.port, function() {
    return console.log('Express server listening on port %d in %s mode', config.port, app.get('env'));
  });
}
