// Author: Jean-Philippe Beaudet @ S3R3NITY Technology 
//
// mail.js
// Version : 1.0.0
// Open-source GNU 3.0
//
// Command line tool to handle deployment, server restart and dependencies
// Change settings here to auto set teh CLI process
//
//========================================================

var Config = {
	chdir: __dirname,
	verbose: true,
	process: [
		{
			cmd:"node index.js -h",
			pid: null,
			status: false,
			makefile: null,
			reinstall : true,
			dependencies: "node_modules",
			cwd: "/deployjs"
		}
	]
}
module.exports = Config;
