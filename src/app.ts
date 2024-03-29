'use strict';

import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import redis from 'redis';
import mysql from 'mysql';

const env = process.env.NODE_ENV || 'development';
import { default as configModule } from '../config/config.json' assert { type: 'json' };
interface IConfig {
  mysql: {};
  server: { port: number };
  cors: { whitelist: string[] };
}
const config: IConfig = configModule[env];

// Create Redis Client
const redisClient = redis.createClient();
redisClient.on('connect', () => {
  console.log('Redis client connected');
});

const mysqlClient = mysql.createConnection(config.mysql);
mysqlClient.connect();

const initializers = {
  config: config,
  mysqlClient: mysqlClient,
  redisClient: redisClient,
};

const app = express();

import * as user from './services/user.js';
import * as cats from './services/cats.js';
// const user = require('./services/user.js')(initializers);
// const cats = require('./services/cats.js')(initializers);
app.set('port', process.env.PORT || config.server.port);

app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies

const router = express.Router(); // get an instance of the express Router

interface ICorsOptions {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => void;
}

let corsOptions: ICorsOptions = {
  origin: function (origin, callback) {
    if (
      typeof origin === 'undefined' ||
      config.cors.whitelist.indexOf(origin) !== -1
    ) {
      // undefined for localhost requests
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(cors(corsOptions));
app.use('/api', router);
app.get('/', function (req: Request, res: Response): void {
  res.json({
    message: 'Restful API',
  });
});
process.env.SECRET_KEY = 'decodekey';

router.post('/register', function (req: Request, res: Response): void {
  const username: string = req.body.username;
  const password: string = req.body.password;

  user.register(res, username, password);
});

router.post('/authenticate', function (req: Request, res: Response): void {
  const username: string = req.body.username;
  const password: string = req.body.password;

  user.authenticate(res, username, password);
});

router.get('/logout', function (req: Request, res: Response): void {
  const token: string = req.body.token || req.headers['token'];
  user.logout(res, token);
});

router.get(
  ['/feed', '/feed/:page/:limit*?'],
  verifyToken,
  function (req: Request, res: Response): void {
    cats.feed(req, res);
  }
);

router.post('/add', verifyToken, function (req: Request, res: Response): void {
  cats.add(req, res);
});

function verifyToken(req: Request, res: Response, next: NextFunction): void {
  var token = req.body.token || req.headers['token'];
  if (typeof token !== 'undefined') {
    redisClient.hgetall(
      token,
      function (err: Error | undefined, storedToken: any): void {
        if (err) {
          res.status(403);
          res.json({
            statys: 403,
            message: err,
          });
        }
        if (parseInt(storedToken.valid) === 0) {
          res.status(403);
          res.json({
            statys: 403,
            message: 'Invalid token',
          });
        } else {
          jwt.verify(
            token,
            process.env.SECRET_KEY!,
            function (err: Error | null) {
              if (err) {
                res.status(403);
                res.json({
                  statys: 403,
                  message: 'JWT expired',
                });
              } else {
                next();
              }
            }
          );
        }
      }
    );
  } else {
    res.status(403);
    res.json({
      status: 403,
      message: 'JWT is not provided',
    });
  }
}

app.listen(app.get('port'), function (): void {
  console.log('Node app is running on port', app.get('port'));
});
