const multer = require('multer');
const gm = require('gm').subClass({imageMagick: true});

module.exports = function (options) {
    this.feed = function (req, res) {
        var where = 'WHERE true';
	var placeholders = [];
	for (let key in req.query) {
		let val = req.query[key];
		placeholders.push(val);
		where += ' AND ' + key + ' = ?';
	}
	let limit = req.params.limit || options.config.perPage;
	let offset = limit * ((req.params.page || 1) - 1);
	let queryString = 'SELECT id, name, specie, color, status, avatar, added FROM cats ' + where + ' LIMIT ' + limit + ' OFFSET ' + offset;
	options.mysqlClient.query(queryString, placeholders, function (err, results, fields) {
		if (err) {
			res.status(400);
			res.json({
				status: 400,
				code: err.sqlState,
				message: err.code
			});
		}
            
		if (results.length > 0) {
			res.send(results);
		} else {
			res.json({
				status: 204,
				message: 'no data'
			});
		}
	});
    },
    this.add = function (req, res) {
         this.uploadImages(req, res, function (avatarName) {
		let name = req.body.name;
		let specie = req.body.specie;
		let color = req.body.color;
		let data = {name: name, specie: specie, color: color, avatar: avatarName};
		options.mysqlClient.query('INSERT INTO cats SET ?', data, function (err, result) {
			if (err) {
				res.status(400);
				res.json({
					status: 400,
					code: err.sqlState,
					message: err.code
				});
			} else {
				res.json({
					status: 200,
					message: 'cat profile added',
					id: result.insertId
				});
			}
		});
	});
    },
    this.uploadImages = function (req, res, cb) {
        const upload = multer({dest: options.config.imagesPath, limits: 1}).single('image');
        upload(req, res, function (err) {
		if (err) {
			throw err;
		}

		let avatarName = options.config.thumPrefix + req.file.filename
		var avatar = options.config.thumbsPath + avatarName;
		gm('./' + req.file.path)
			.resize('250', '180', '^')
			.gravity('center')
			.extent(250, 180)
			.write(avatar, function (err) {
				if (err) {
					res.status(400);
					res.json({
						status: 400,
						message: err
					});
				}
			});
		cb(avatarName);
	});
    }
    
    return this;
}
