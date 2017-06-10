// Author: Jean-Philippe Beaudet @ S3R3NITY Technology 
//
// config.js
// Version : 0.0.1
// Open-source GPL-3.0
//
// Command line tool to handle deployment, server restart and dependencies
// Change settings here to auto set teh CLI process
//
// allowed authentication type:  "passphrase", "sudo", "git" 
// ttl = time cycle in milliseconds for the pid lookup (default to 100)
//
// base structure for configuring one or more process automation
//========================================================
var path = require('path'); 

var Config = {
	root: path.normalize(path.dirname(__dirname)),
	verbose: true,
	process: [
		{
			cmd:"node index -h",
			pid: null,
			ttl:100,
			status: false,
			makefile: null,
			reinstall : false,
			dependencies: null,
			cwd: "/deployjs",
			authentication: false,
			credentials:{
				type: null , 
				username: null,
				password: null,
				sudo: null,
				passphrase: null
			}
		}
	]
}
module.exports = Config;
