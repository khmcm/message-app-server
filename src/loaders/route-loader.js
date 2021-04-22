const fs       = require('fs'),
      rootPath = require('app-root-path').path,
      path     = require('path'),
      cors     = require('cors'),
      config   = require(path.join(rootPath, 'src', 'config.js'));

function checkOrigins(allowedOrigins, req, res) {
    if(allowedOrigins.includes(req.get('origin'))) {
        res.set('Access-Control-Allow-Origin', req.get('origin'));
    } else {
        res.set('Access-Control-Allow-Origin', undefined);
    }
}

const loadRoute = (route, app, dependencies) => {
    const filePath = path.join(rootPath, 'src', 'routes', route);
    if(fs.lstatSync(filePath).isFile()) {
        //Load the file
        const importedRouteFile = require(filePath);
        //Break the imported route file path into its method
        //and path.
        const [routeFileMethod, routeFilePath] = importedRouteFile.path.split(' ');
        app['options'](routeFilePath, (req, res, next) => {
            checkOrigins(config.allowedOrigins, req, res);
            res.set('Access-Control-Allow-Headers', 'Content-Type');
            res.set('Access-Control-Allow-Methods', 'POST, GET');
            res.end();
        });
        app[routeFileMethod.toLowerCase()](routeFilePath, (req, res, next) => { 
            checkOrigins(config.allowedOrigins, req, res);
            importedRouteFile.handler(dependencies)(req, res, next);
        });
    } else {
        const routeFiles = fs.readdirSync(path.join(rootPath, 'src', 'routes'));
        routeFiles.forEach((routeFile) => {
            loadRoute(routeFile, app, dependencies);
        });
    }
}

const routeLoader = (app, dependencies) => {
    //Load the routes
    const routeFiles = fs.readdirSync(path.join(rootPath, 'src', 'routes'));
    
    //Iterate through each route file and add them as routes.
    routeFiles.forEach((routeFile) => {
        
        loadRoute(routeFile, app, dependencies);
    
    });
}

module.exports = routeLoader;