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
// spawn observer
(function() {
	var childProcess = require("child_process");
	var oldSpawn = childProcess.spawn;
	function mySpawn() {
		console.log('spawn called');
		console.log(arguments);
		var result = oldSpawn.apply(this, arguments);
		return result;
	}
	childProcess.spawn = mySpawn;
})();

// dependencies
//////////////////////////////////////////////////////////////////

var program = require('commander');
var fs = require('fs')
var ps = require('ps-node');
var path = require('path'); 
var jsonfile = require('jsonfile')
var process = require('process');

// globals
/////////////////////////////////////////////////////////////////
var CONFIG = null
var PROC = {}
var RECOVERY = path.join(__dirname, "/bin/recovery.js")

// helpers section
/////////////////////////////////////////////////////////////////

// Create a new object, that prototypically inherits from the Error constructor
function MyError(message) {
  this.name = 'MyError';
  this.message = message || 'Default Message';
  this.stack = (new Error()).stack;
}
MyError.prototype = Object.create(Error.prototype);
MyError.prototype.constructor = MyError;

function deleteFolderRecursive(path, cb) {
	console.log("DELETEFILE: "+path)
	if( fs.existsSync(path) ) {
		fs.readdirSync(path).forEach(function(file,index){
			console.log(path + "/" + file)
		var curPath = path + "/" + file;
		if(fs.lstatSync(curPath).isDirectory()) { // recurse
			deleteFolderRecursive(curPath);
		} else { // delete file
			fs.unlinkSync(curPath);
		}
		});
		fs.rmdirSync(path);
	}
	cb()
};

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

function getCommand(cmd){
	var c = cmd
	var s = c.split(" ")
	var args =[]
	for (var x = 1; x < s.length; x++) {
		args.push(s[x])
		}
	this.command = s[0]
	this.args =  args
}
// execute a makefile in the chosen cwd before spawning the process anew
function make(makefile, cwd, cb){
	changeDirectory( path.join(__dirname, cwd))
	console.log('MAKEFILE TRIGGERED:');
	const  exec  = require('child_process').exec;
	exec(makefile, function(err, stdout, stderr){
		if (err) {
			console.error(err);
			return cb(err);
		}
		console.log(' MAKEFILE stdout:'+stdout);
		return cb(null)
	})
	
};

// execute a makefile in the chosen cwd before spawning the process anew
function install(dependencies, cwd,  cb){console.log( ' INSTALL TRIGGERED:');
	//changeDirectory( path.join(__dirname, cwd))
	deleteFolderRecursive(path.join(__dirname, dependencies), function () { 
		const  exec  = require('child_process').exec;
		console.log('rm -rf done for: '+path.join(__dirname, cwd, dependencies)); 
		exec("npm install", function(err, stdout, stderr){
			if (err) {
				console.error(' INSTALL err:'+err);
				return cb(err);
			}
			console.log(' INSTALL stdout:'+stdout);
			return cb(null)
		})
	});
};

// boostrap a failed process, re-install if called so and restart
function bootstrap(id){
try {
	console.log( ' BOOTSTRAP TRIGGERED: %s', id);
	fs.stat(RECOVERY, function(err, stat) {
		if(err == null) {
			jsonfile.readFile(RECOVERY, function(err, obj) {
				if (obj != null){
					//console.log( ' COMMAND: %s', obj.process[id].cmd);
					var cmd = obj.process[id].cmd
					var reinstall = obj.process[id].reinstall
					var makefile = obj.process[id].makefile
					var dependencies = obj.process[id].dependencies
					var cwd = obj.process[id].cwd
					if (reinstall){
						if (makefile != null){
							console.log( ' MAKEFILE TRIGGERED: %s', id);
							make(makefile, cwd, function(err){
								if (err){
									console.log(err)
								}
								if(dependencies != null){
									console.log( ' REINSTALL TRIGGERED: %s', id);
									install(dependencies, cwd, function(err){
										if (err){
											console.log(err)
										}
										var exec = new getCommand(cmd)
										return start(exec.command, exec.args, id, obj, cwd)
									})
								}else{
									var exec = new getCommand(cmd)
									return start(exec.command, exec.args, id, obj, cwd)
								}
							})
						}
						if(dependencies != null){
							console.log( ' REINSTALL TRIGGERED: %s', id);
							install(dependencies, cwd, function(err){
								if (err){
									console.log(err)
								}
								var exec = new getCommand(cmd)
								return start(exec.command, exec.args, id, obj, cwd)
							})
						}
						
					}else{
						var exec = new getCommand(cmd)
							start(exec.command, exec.args, id, obj, cwd)
					}
					
				}else{
					throw new MyError("you must run config or setup befor starting, or bootstraping commands ");
				}
			})
			
		}else{
			throw new MyError("recovery file path is invalid ");
		}
})
}catch (err) {
	console.log('chdir: ' + err);
}
}

//lookup to pid and return a boolean
function lookup(pid, id){
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
			console.log( 'No such process found! PID: '+pid);
			return bootstrap(id)
		}
});
}
// listen to process from pid
function listen(pid, id){
try {
	setTimeout(function(){ 
		lookup(pid, id)
	}, 1000);

}catch(err) {
	throw new MyError(" listen() has failed for PID: "+pid);
}
}

// change directory to spwan new process
function changeDirectory(cwd){
	console.log('Starting directory: ' + process.cwd());
try {
	process.chdir(cwd);
	console.log('New directory: ' + process.cwd());
}
catch (err) {
	console.log('chdir: ' + err);
}
}

// start to process and record pid
function start(command, args, id, obj,cwd){

try {
	changeDirectory( path.join(__dirname, cwd))
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

//constructor sections
/////////////////////////////////////////////////////////////////
function deploy(program){
try {
	this.chdir = program.chdir || __dirname
	this.verbose = program.verbose
	this.process = program.process || []
}catch(err) {
	throw new MyError("deploy constructor has failed");
}
}

function watcher(options){
try {
	this.cwd =  path.normalize(program.chdir) || "/"
	this.pid = null
	this.status = false
	if(options.makefile){
		fs.stat(options.makefile, function(err, stat) {
			if(err == null) {
				this.makefile = options.makefile
			}else{
				throw new MyError("makeFile path is not valid makefile: "+options.makefile);
			}
		}); 
		
	}
	if(options.dependencies){
		fs.stat(options.dependencies, function(err, stat) {
			if(err == null) {
				this.dependencies = options.dependencies
			}else{
				throw new MyError("dependencies path is not valid path: "+options.dependencies);
			}
		}); 
		
		if (options.dependencies ==null && options.makefile == false){
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

// command-line options section
/////////////////////////////////////////////////////////////////
program
	.version('0.0.1')
	.usage('node index -c <command>,<arg1>,<arg2>,ect..')
	.description('setup main options for the deployment')
	.option('-v, --verbose', 'Set to verbose ')
	.option('-ch, --chdir <path>', 'change the base working directory', __dirname)
	
// node index add -c "node index -h"
program
	.command('add')
	.description('add a new process to be watched')
	.option('-C, --chdir <path>', 'change the working directory', "/")
	.option('-c, --cmd [String]', 'Array of command and args', null)
	.option('-d, --dependencies [String]', 'Array dependencies files', null)
	.option('-r, --reinstall [mode]', 'Set to re-install dependencies ', false)
	.option("-m, --makefile [path]", "path to a makefile to install dependencies", null)
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
							var exec = new getCommand(obj.process[i].cmd)
								start(exec.command, exec.args, i, obj, obj.process[i].cwd)
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
