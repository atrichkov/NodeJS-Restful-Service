CREATE DATABASE IF NOT EXISTS restfulService;
use restfulService;

CREATE TABLE IF NOT EXISTS users (
    id int NOT NULL AUTO_INCREMENT,
        username varchar(50) NOT NULL UNIQUE,
	pass varchar(100) NOT NULL,
	regdate timestamp default now(),

	PRIMARY KEY (id)	
) ENGINE=INNODB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS cats (
    id int NOT NULL AUTO_INCREMENT,
    name varchar(50) NOT NULL,
	specie varchar(20) NOT NULL,
	color varchar(20) NOT NULL,
	status smallint DEFAULT 1,
        avatar varchar(100) NOT NULL,
	added timestamp default now(),

	PRIMARY KEY (id)	
) ENGINE=INNODB DEFAULT CHARSET=utf8;
