const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = function (options) {
    this.register = function (res, username, password) {
        if (username && password) {
                bcrypt.genSalt(10, function (err, salt) {
                bcrypt.hash(password, salt, function (err, bcryptedPassword) {
                    if (err) {
                        throw err;
                    }

                    let data = {pass: bcryptedPassword, username: username};
                    options.mysqlClient.query('INSERT INTO users SET ?', data, function (err, result) {
                        if (err) {
                            res.status(400);
                            res.json({
                                status: 400,
                                code: err.sqlState,
                                message: err.code
                            });
                        }

                        res.json({
                            message: 'user registered',
                            id: result.insertId
                        });
                    });
                });
            });
        } else {
            res.status(400);
            res.json({
                status: 400,
                message: 'please provide username and password params'
            });
        }
    },
    this.authenticate = function (res, username, password) {
        let queryString = 'SELECT id, username, pass FROM users WHERE username = ?';
        options.mysqlClient.query(queryString, [username], function (err, user, fields) {
		if (err) {
			res.status(400);
			res.json({
				status: 400,
				code: err.sqlState,
				message: err.code
			});
		}

		bcrypt.compare(password, user[0].pass, function (err, match) {
			if (match === true) {
				if (user[0]) {
					let token = jwt.sign(user[0], process.env.SECRET_KEY, {expiresIn: '1h'});
					options.redisClient.HMSET(token, {
						"expire": options.config.token_life,
						"valid": 1
					});

					res.json({
						status: 200,
						message: 'Authenticated! Use this token in the "Authorization" header',
						token: token
					});
				} else {
					res.status(403);
					res.json({
						status: 403,
						message: 'Unauthorized user!'
					});
				}
			} else {
				res.status(403);
				res.json({
					status: 403,
					message: 'Unauthorized user!'
				});
			}
		});
	});
    },
    this.logout = function (res, token) {
        options.redisClient.HMSET(token, {
		"expire": 0,
		"valid": 0
	});

	res.json({
		status: 200,
		message: 'token is blacklisted',
		token: token
	});
    }
    
    return this;
}

//console.log(user);
