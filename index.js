// Author: Jean-Philippe Beaudet @ S3R3NITY Technology 
//
// mail.js
// Version : 1.0.0
// Open-source GNU 3.0
//
// Command line tool to handle deployment, server restart and dependencies
// Example of single manual use:
//
//========================================================

// dependencies
//////////////////////////////////////////////////////////////////

var program = require('commander');
var fs = require('fs')
var ps = require('ps-node');
var path = require('path'); 
var jsonfile = require('jsonfile')

// globals
/////////////////////////////////////////////////////////////////
var CONFIG = null
var PROC = {}
var RECOVERY = "./recovery.json"
// helpers
function collect(val, memo) {
	memo.push(val);
	return memo;
}
// Create a new object, that prototypically inherits from the Error constructor
function MyError(message) {
  this.name = 'MyError';
  this.message = message || 'Default Message';
  this.stack = (new Error()).stack;
}
MyError.prototype = Object.create(Error.prototype);
MyError.prototype.constructor = MyError;

//deploy object constructor and prototypes
/////////////////////////////////////////////////////////////////
function deploy(program){
	try {
	this.dir = program.chdir

	if(program.cmd.length >0){
		this.cmd = program.cmd
	}else{
		throw new MyError("must have at least 1 command ti run");
	}
	this.process = []
	}
	catch(err) {
		throw new MyError(err.message);
	}
}
function watcher(process){
	this.pid = process.pid
	this.status = false
	if(program.makefile){
		path.exists(program.makefile, function(exists) { 
			if (exists) { 
				this.dependencies = program.makefile
			}else{
				throw new MyError("makeFile path is not valid makefile: "+program.makefile);
			}
		}); 
		
	}else{
		for (var i = 0; i < program.dependencies.length; i++) { 
			path.exists( program.dependencies[i], function(exists) { 
				if (exists) { 
					this.dependencies.push( program.dependencies[i])
				}else{
					throw new MyError("dependencies path is not valid path: "+program.dependencies[i]);
				}
			}); 
		}
		if (program.dependencies.length ==0){
			this.dependencies.push('node_modules')
		}
	}
	this.reinstall = program.reinstall
}
watcher.prototype.listen(){
	// startb the process lookup
}
watcher.prototype.make(){
	// re-install process dependencies
}
watcher.prototype.restart(){
	// kill , re-install and start the process anew
}
// program start
/////////////////////////////////////////////////////////////////
program
	.version('0.0.1')
	.usage('node index -c <command>,<arg1>,<arg2>,ect..')
	.description('setup main options for the deployment')
	.option('-C, --chdir <path>', 'change the working directory', __dirname)
	.option('-c, --cmd [Array]', 'Array of command and args', collect, [])
	.option('-d, --dependencies [Array]', 'Array dependencies files', collect, [])
	.option('-r, --reinstall', 'Set to re-install dependencies ')
	.option('-v, --verbose', 'Set to verbose ')
	.option("-m, --makefile [mode]", "use a makefile for dependencies", null)

program
	.command('config')
	.description('use a config file for the deployment')
	.option('-p, --path [String]', 'path to use a config file, default to '+__dirname+"/config.json", __dirname+"/config.json")
	.action(function(env, options){
		if (options.dependencies.length > 0 || options.cmd.length > 0 ){
			throw new MyError("cannot use config with other options");
		}
		console.log('action for configfile has been called', options);
		path.exists(options.path, function(exists) { 
			if (exists) { 
				CONFIG = require(options.path)
			}else{
				throw new MyError("config file path is invalid: "+options.path);
			}
		})
			
		PROC = new deploy(CONFIG)
		path.exists(RECOVERY, function(exists) { 
			if (exists) { 
				jsonfile.writeFile(options.path, PROC, function (err) {
					if(err){
					throw new MyError(err.message);
				}
				if (program.verbose){
					console.log('PROC created: '+JSON.stringify(PROC))
				}
				})
			}else{
				throw new MyError("RECOVERY file path is invalid: "+RECOVERY);
			}
		});
	});
	
	// parse the args
	program.parse(process.argv);
	
	// view options state
	if (program.verbose){
		console.log('--verbose is activated')
		console.log('--cmd: '+program.cmd)
		console.log('--chdir: '+program.chdir)
		console.log('--dependencies: '+program.dependencies)
		console.log('--reinstall: '+program.reinstall)
	}
	
	// Start the program
	// 1. setup deploy object- catch cmd and args, working directory and dependencies/makefile files
	if (PROC == {}){
		PROC = new deploy(program)
		path.exists(options.path, function(exists) { 
			if (exists) { 
				jsonfile.writeFile(options.path, PROC, function (err) {
					if(err){
					throw new MyError(err.message);
				}
				if (program.verbose){
					console.log('PROC created: '+JSON.stringify(PROC))
				}
				})
			}else{
				throw new MyError("config file path is invalid: "+options.path);
			}
		});
		
	}
	// save the last PROC object to file for recovery
	
	// 2. start the commands list and store their pid in a txt file
	
	// 3. setup a lookup on the current pids , setup chmod permission for deploys
	
	// 4. on err, crash ect.. 
	
		// >> stop, kill current pid
		// >> rm -rf all dependencies
		// >> if makefile>> use makefile
		// >> if dependencies >> npm install 
		
		// then restart the list of commands, and store the new pid, setup new lookup
