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
var RECOVERY = path.join(__dirname, "/bin/recovery.js")
var _DIR = __dirname

// helpers
/////////////////////////////////////////////////////////////////
function collect(val, memo) {
	memo.push(val);
	return memo;
}
function unCircularize(o) {
	seen = [];
	var ret = JSON.stringify(o, function(key, val) {
	if (val != null && typeof val == "object") {
		if (seen.indexOf(val) >= 0) {
			return;
		}
		seen.push(val);
	}
	return val;
});
return ret
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
	this.verbose = program.verbose
	this.process = program.process || []
}catch(err) {
	throw new MyError("deploy constructor has failed");
}
}
deploy.prototype.add = function(options){
	return new watcher(options)
}
function watcher(options){
try {
	this.dir = program.chdir
	this.pid = null
	this.status = false
	this.dependencies =[]
	if(options.makefile){
		fs.stat(options.makefile, function(err, stat) {
			if(err == null) {
				this.makefile = options.makefile
			}else{
				throw new MyError("makeFile path is not valid makefile: "+options.makefile);
			}
		}); 
		
	}else{
		for (var i = 0; i < options.dependencies.length; i++) { 
			fs.stat(options.dependencies[i], function(err, stat) {
				if(err == null) {
					this.dependencies.push( options.dependencies[i])
				}else{
					throw new MyError("dependencies path is not valid path: "+options.dependencies[i]);
				}
			}); 
		}
		if (options.dependencies.length ==0 && options.makefile == false){
			this.dependencies.push('node_modules')
		}
	}
	this.reinstall = options.reinstall
	if(options.cmd){
		this.cmd = options.cmd
	}else{
		throw new MyError("must have at least 1 command ti run");
	}
}catch(err) {
		throw new MyError("process constructor has failed");
}
}
// boostrap a failed process, re-install if called so and restart
function boostrap(id){
	fs.stat(RECOVERY, function(err, stat) {
		if(err == null) {
			jsonfile.readFile(RECOVERY, function(err, obj) {
				if (obj != null){
					console.log( ' COMMAND: %s', obj.process[id].cmd);
					var cmd = obj.process[id].cmd
					var reinstall = obj.process[id].reinstall
					var makefile = obj.process[id].makefile
					var dependencies = obj.process[id].dependencies
				}
				
			})
			
		}else{
			throw new MyError("process file is not valid, please run setup or config ");
		}
})
}

//lookup to pid and return a boolean
function lookup(pid){
		ps.lookup({ pid: pid}, function(err, resultList ) {
		if (err) {
			throw new Error( err );
		}
		var process = resultList[ 0 ];
		if( process ){
			console.log( 'PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments );
			return true
		}
		else {
			console.log( 'No such process found!' );
			return false
		}
});
}
// listen to process from pid
function listen(pid, id){
try {
//while(true){
setTimeout(function(){ 
	if(lookup(pid) == false){
		bootstrap(id)
	}
	}, 1000);
//}
}catch(err) {
	throw new MyError(" listen() has failed for pis "+pid);
}
}

// start to process and record pid
function start(command, args, id, obj){
try {
	const spawn = require('child_process').spawn;
	console.log(" start cmd: "+ '("'+command+'",'+args+')')
	const cmd = spawn(command, args);
	cmd.stdout.on('data', (data) => {
		console.log(" process for "+cmd+" is PID: "+cmd.pid)
		obj.process[id].pid = cmd.pid
		obj.process[id].status = true
		jsonfile.writeFile(RECOVERY, obj, function (err) {
			if(err){
				throw new MyError(err.message);
			}
			listen(cmd.pid, id)
			console.log(`stdout: ${data}`);
		})
	});

	cmd.stderr.on('data', (data) => {
		console.log(`stderr: ${data}`);
	});

	cmd.on('close', (code) => {
 		
		obj.process[id].pid = null
		obj.process[id].status = false
		jsonfile.writeFile(RECOVERY, obj, function (err) {
			if(err){
				throw new MyError(err.message);
			}
			//listen(cmd.pid)
			console.log(`child process exited with code ${code}`);
		})
	});
}catch(err) {
	throw new MyError("start command has failed for "+'("'+command+'",'+args+')');
}
}
// program start
/////////////////////////////////////////////////////////////////
program
	.version('0.0.1')
	.usage('node index -c <command>,<arg1>,<arg2>,ect..')
	.description('setup main options for the deployment')
	.option('-v, --verbose', 'Set to verbose ')
	
// node index add -c "node index -h"
program
	.command('add')
	.description('add a new process to be watched')
	.option('-C, --chdir <path>', 'change the working directory', __dirname)
	.option('-c, --cmd [String]', 'Array of command and args', null)
	.option('-d, --dependencies [Array]', 'Array dependencies files', collect, [])
	.option('-r, --reinstall [mode]', 'Set to re-install dependencies ', false)
	.option("-m, --makefile [mode]", "use a makefile for dependencies", false)
	.action(function(options){
		fs.stat(RECOVERY, function(err, stat) {
			if(err == null) {
				jsonfile.readFile(RECOVERY, function(err, obj) {
					if (obj != null){
						var p = new watcher(options)
						console.log("new command p : "+JSON.stringify(p))
						obj.process.push(p)
						jsonfile.writeFile(RECOVERY, obj, function (err) {
							if(err){
								throw new MyError("writing new process has failed");
							}
							console.log("new command succesfully added : "+JSON.stringify(obj))
						})
					}
				})
			}else{
				throw new MyError("you must run setup or config command before adding process to be listened");
			}
		})
	});
	
// node index config -p "./config.js"
program
	.command('config')
	.description('use a config file for the deployment')
	.option('-p, --path [String]', 'path to use a config file, default to '+path.join(__dirname,"/config.json"))
	.action(function(options){
		//if (options.dependencies.length > 0 || options.cmd.length > 0 ){
			//throw new MyError("cannot use config with other options");
		//}
		//console.log('config command with options:'+  unCircularize(options));
		console.log('config command with options.path:'+  options.path);
		var config_path= path.join( __dirname,"/config.js")
		if(options && options.path){
			 config_path = options.path
		}
		fs.stat(config_path, function(err, stat) {
			if(err == null) {
				CONFIG = require(config_path)
				console.log('config had been read with:'+  JSON.stringify(CONFIG));
				PROC = new deploy(CONFIG)
			}else{
				throw new MyError("config file path is invalid: "+options.path);
			}
		})
			
		
		fs.stat(RECOVERY, function(err, stat) {
			if(err == null) {
				jsonfile.writeFile(RECOVERY, PROC, function (err) {
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
	
// node index start -v
program
	.command('start')
	.description('start all process ')
	.option('-v, --verbose', 'Set to verbose ')
	.action(function(options){
		fs.stat(RECOVERY, function(err, stat) {
			
			if(err == null) {
				jsonfile.readFile(RECOVERY, function(err, obj) {
					if (obj != null){
						const  cmd =[]
						for (var i = 0; i < obj.process.length; i++) {
							var c = obj.process[i].cmd
							console.log("obj recovered is: "+JSON.stringify(c)) 
							var s = c.split(" ")
							var command = s[0]
							var args =[]
							console.log("obj plit s: "+JSON.stringify(s))
							for (var x = 1; x < s.length; x++) {
								args.push(s[x])
							}
							console.log("obj command: "+JSON.stringify(command))
							console.log("obj args: "+JSON.stringify(args))
							start(command, args, i, obj)
						}
					}
	});
}
})
})
	
// node setup start -v
program
	.command('setup')
	.description('add a new process to be watched')
	.option('-v, --verbose', 'Set to verbose ')
	.action(function(options){
		PROC = new deploy(options)
		fs.stat(RECOVERY, function(err, stat) {
			if(err == null) {
				jsonfile.writeFile(RECOVERY, PROC, function (err) {
					if(err){
					throw new MyError(err.message);
				}
				if (program.verbose){
					console.log('PROC created: '+JSON.stringify(PROC))
				}
				})
			}else{
				throw new MyError("config file path is invalid: "+RECOVERY);
			}
		});
		
	})
	
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

	// save the last PROC object to file for recovery
	
	// 2. start the commands list and store their pid in a txt file
	
	// 3. setup a lookup on the current pids , setup chmod permission for deploys
	
	// 4. on err, crash ect.. 
	
		// >> stop, kill current pid
		// >> rm -rf all dependencies
		// >> if makefile>> use makefile
		// >> if dependencies >> npm install 
		
		// then restart the list of commands, and store the new pid, setup new lookup
