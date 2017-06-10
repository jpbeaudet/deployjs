// Author: Jean-Philippe Beaudet @ S3R3NITY Technology 
//
// config.js
// Version : 0.0.1
// Open-source GPL-3.0
//
// Command line tool to handle deployment, server restart and dependencies
// Change settings here to auto set teh CLI process
//
//========================================================
var path = require('path'); 

var Config = {
	root: path.normalize(path.dirname(__dirname)),
	verbose: true,
	process: [
		{
			cmd:"node index.js -h",
			pid: null,
			status: false,
			makefile: null,
			reinstall : true,
			dependencies: "bidon2",
			cwd: "/deployjs"
		}
	]
}
module.exports = Config;
