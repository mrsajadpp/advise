var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var handlebars = require('express-handlebars');
var session = require('express-session');
var logger = require('morgan');
let fileUpload = require('express-fileupload');
let favicon = require("serve-favicon");

var db = require('./database/config.js');
var usersRouter = require('./routes/user');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.use(favicon(path.join(__dirname, 'public', '/images/favicon.png')));
app.engine('hbs', handlebars.engine({ extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layouts/', partialsDir: __dirname + '/views/partials/' }));
app.use(session({ secret:"150@#$785", cookie:{ maxAge: 60000000 } }));
db.connect((err) => {
  if (err) {
    console.log('Database connection error : '+err);
  } else {
    console.log('Database connected!');
  }
});
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use('/', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
