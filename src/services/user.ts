const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = function (options: any) {
  (this.register = function (res: any, username: string, password: string) {
    if (username && password) {
      bcrypt.genSalt(10, function (err: {}, salt: string) {
        bcrypt.hash(
          password,
          salt,
          function (err: {}, bcryptedPassword: string) {
            if (err) {
              throw err;
            }

            let data = { pass: bcryptedPassword, username: username };
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
      res: any,
      username: string,
      password: string
    ) {
      let queryString =
        'SELECT id, username, pass FROM users WHERE username = ?';
      options.mysqlClient.query(
        queryString,
        [username],
        function (err: any, user: any[]) {
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
            function (err: any, match: boolean) {
              if (match === true) {
                if (user[0]) {
                  let token = jwt.sign(user[0], process.env.SECRET_KEY, {
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
    (this.logout = function (res: any, token: string) {
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
};
