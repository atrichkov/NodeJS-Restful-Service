import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Response } from 'express';

export default function (options: any) {
  (this.register = function (
    res: Response,
    username: string,
    password: string
  ) {
    if (username && password) {
      bcrypt.genSalt(10, function (err: {}, salt: string): void {
        bcrypt.hash(
          password,
          salt,
          function (err: {}, bcryptedPassword: string): void {
            if (err) {
              throw err;
            }

            const data = { pass: bcryptedPassword, username: username };
            options.mysqlClient.query(
              'INSERT INTO users SET ?',
              data,
              function (
                err: { sqlState: string; code: number },
                result: { insertId: number }
              ) {
                if (err) {
                  res.status(400);
                  res.json({
                    status: 400,
                    code: err.sqlState,
                    message: err.code,
                  });
                }

                res.json({
                  message: 'user registered',
                  id: result.insertId,
                });
              }
            );
          }
        );
      });
    } else {
      res.status(400);
      res.json({
        status: 400,
        message: 'please provide username and password params',
      });
    }
  }),
    (this.authenticate = function (
      res: Response,
      username: string,
      password: string
    ) {
      let queryString =
        'SELECT id, username, pass FROM users WHERE username = ?';
      options.mysqlClient.query(
        queryString,
        [username],
        function (err: undefined | any, user: any[]) {
          if (err) {
            res.status(400);
            res.json({
              status: 400,
              code: err.sqlState,
              message: err.code,
            });
          }

          bcrypt.compare(
            password,
            user[0].pass,
            function (err: undefined | any, match: boolean): void {
              if (match === true) {
                if (user[0]) {
                  let token = jwt.sign(user[0], process.env.SECRET_KEY!, {
                    expiresIn: '1h',
                  });
                  options.redisClient.HMSET(token, {
                    expire: options.config.token_life,
                    valid: 1,
                  });

                  res.json({
                    status: 200,
                    message:
                      'Authenticated! Use this token in the "Authorization" header',
                    token: token,
                  });
                } else {
                  res.status(403);
                  res.json({
                    status: 403,
                    message: 'Unauthorized user!',
                  });
                }
              } else {
                res.status(403);
                res.json({
                  status: 403,
                  message: 'Unauthorized user!',
                });
              }
            }
          );
        }
      );
    }),
    (this.logout = function (res: Response, token: string) {
      options.redisClient.HMSET(token, {
        expire: 0,
        valid: 0,
      });

      res.json({
        status: 200,
        message: 'token is blacklisted',
        token: token,
      });
    });

  return this;
}
