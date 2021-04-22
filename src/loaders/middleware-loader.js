const bodyParser       = require('body-parser'),
      cookieParser     = require('cookie-parser'),
      path             = require('path'),
      rootPath         = require('app-root-path').path;

module.exports = (app) => {

    //Parses request body data 
    app.use(bodyParser.json());

    //Parses request url query data
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(cookieParser());
}