'use strict';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const jwt = require('jsonwebtoken');
const redis = require('redis');
const mysql = require('mysql');

var env = process.env.NODE_ENV || 'development';
const config = require('./config/config.json')[env];

// Create Redis Client
let redisClient = redis.createClient();
redisClient.on('connect', function () {
	console.log('Redis client connected');
});

let mysqlClient = mysql.createConnection(config.mysql);
mysqlClient.connect();

var initializers = {
    config: config,
    mysqlClient: mysqlClient,
    redisClient: redisClient
}

const user = require('./services/user.js')(initializers);
const cats = require('./services/cats.js')(initializers);
app.set('port', (process.env.PORT || config.server.port));

app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies

const router = express.Router(); // get an instance of the express Router
let corsOptions = {
	origin: function (origin, callback) {
                if (config.cors.whitelist.indexOf(origin) !== -1 || typeof origin === 'undefined') { // undefined for localhost requests
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
	}
}

app.use(cors(corsOptions));
app.use('/api', router);
app.get('/', function (req, res) {
	res.json({
		message: 'Restful API'
	});
});
process.env.SECRET_KEY = 'decodekey';

router.post('/register', function (req, res) {
	let username = req.body.username;
	let password = req.body.password;
	console.log(123);

	user.register(res, username, password);
});

router.post('/authenticate', function (req, res) {
	let username = req.body.username;
	let password = req.body.password;
        user.authenticate(res, username, password);
});

router.get('/logout', function (req, res) {
	let token = req.body.token || req.headers['token'];
        user.logout(res, token);
});

router.get(['/feed', '/feed/:page/:limit*?'], verifyToken, function (req, res) {
        cats.feed(req, res);
});

router.post('/add', verifyToken, function (req, res) {
	cats.add(req, res);
});

function verifyToken (req, res, next) {
	var token = req.body.token || req.headers['token'];
	if (typeof token !== 'undefined') {
		redisClient.hgetall(token, function (err, storedToken) {
			if (err) {
				res.status(403);
				res.json({
					statys: 403,
					message: err
				});
			}
			if (parseInt(storedToken.valid) === 0) {
				res.status(403);
				res.json({
					statys: 403,
					message: 'Invalid token'
				});
			} else {
				jwt.verify(token, process.env.SECRET_KEY, function (err, data) {
					if (err) {
						res.status(403);
						res.json({
							statys: 403,
							message: 'JWT expired'
						});
					} else {
						next();
					}
				});
			}
		});
	} else {
		res.status(403);
		res.json({
			status: 403,
			message: 'JWT is not provided'
		});
	}
}

app.listen(app.get('port'), function () {
	console.log('Node app is running on port', app.get('port'));
});
