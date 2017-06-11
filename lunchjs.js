// Author: Jean-Philippe Beaudet @ S3R3NITY Technology 
//
// lunchjs.js
// Version : 0.0.2
// Open-source GPL-3.0
//
// Command line tool to handle deployment, server restart and dependencies
// Change settings here to auto set teh CLI process
//
//========================================================
// spawn observer
(function() {
	var childProcess = require("child_process");
	var oldSpawn = childProcess.spawn;
	function mySpawn() {
		if(VERBOSE){
			console.log(APPNAME+' | SPAWN | reports: ');
			console.log(arguments);
		}
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
var suppose = require('suppose')
var moment = require("moment")
var prettyjson = require('prettyjson');

// globals
/////////////////////////////////////////////////////////////////
var CONFIG = null
var PROC = {}
var RECOVERY = path.join(__dirname, "/bin/recovery.js")
var DEBUG = path.join(__dirname,'/bin/debug.txt')
var NOW = moment().format('lll')
var APPNAME = " LUNCHJS : "+NOW+" "
var VERBOSE = false

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
	if(VERBOSE){
		console.log(APPNAME+" IMPORTANT | deleting directories an files on path: "+path)
	}
	if( fs.existsSync(path) ) {
		fs.readdirSync(path).forEach(function(file,index){
			if(VERBOSE){
				console.log(APPNAME+" Deleting... "+path+"/" +file)
			}
		var curPath = path + "/" + file;
		if(fs.lstatSync(curPath).isDirectory()) { // recurse
			deleteFolderRecursive(curPath,function(){
				
				});
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
try {
	var command;
	var ext = makefile.split('.').pop();
	switch (ext) {
	case "sh":
		command = "bash "
		break;
	case "js":
		command = "node "
		break;
	case "py":
		command = "python "
		break;
	default:
		throw new MyError(APPNAME+" CRITICAL | makefile | extension is not supported extension: "+ext);
		break;
	}
	if(__dirname != cwd){
		changeDirectory( path.normalize(cwd))
	}
	const  exec  = require('child_process').exec;
	exec(command+makefile, function(err, stdout, stderr){
		if (err) {
			console.error(APPNAME+" CRITICAL | err: "+err);
			return cb(err);
		}
		return cb(null)
	})
}catch (err) {
	throw new MyError(APPNAME+" CRITICAL | Makefile |  err: " + err);
}
};

// execute a makefile in the chosen cwd before spawning the process anew
function install(dependencies, cwd,  cb){
	if(__dirname != cwd){
		changeDirectory( path.normalize(cwd))
	}
	deleteFolderRecursive(path.join(__dirname, dependencies), function () { 
		const  exec  = require('child_process').exec;
		exec("npm install", function(err, stdout, stderr){
			if (err) {
				console.error(APPNAME+' CRITICAL | INSTALL err:'+err.message);
				return cb(err);
			}
			return cb(null)
		})
	});
};

// boostrap a failed process, re-install if called so and restart
function bootstrap(id){
try {
	fs.stat(RECOVERY, function(err, stat) {
		if(err == null) {
			jsonfile.readFile(RECOVERY, function(err, obj) {
				if (obj != null){
					//console.log( ' COMMAND: %s', obj.process[id].cmd);
					var root = obj.root
					var cmd = obj.process[id].cmd
					var reinstall = obj.process[id].reinstall
					var makefile = obj.process[id].makefile
					var dependencies = obj.process[id].dependencies
					var cwd = path.join(root, obj.process[id].cwd)
					if (reinstall){
						if (makefile != null){
							//console.log( APPNAME+' | bootstrap | Makefile triggered: %s', id);
							make(makefile, cwd, function(err){
								if (err){
									console.log(err)
								}
								if(dependencies != null){
									//console.log( APPNAME+' | bootstrap | new install for: %s', id);
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
							//console.log( APPNAME+' | bootstrap |  new install for: %s', id);
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
					throw new MyError(APPNAME+" CRITICAL | Boostrap | you must run config or setup befor starting, or bootstraping commands ");
				}
			})
			
		}else{
			throw new MyError(APPNAME+" CRITICAL | Boostrap | RECOVERY file path is invalid ");
		}
})
}catch (err) {
	console.log(APPNAME+' CRITICAL | chdir: ' + err);
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
			if(VERBOSE){
				console.log("\n")
				console.log( APPNAME+' | Lookup | PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments );
			}
			return true
		}
		else {
			if(VERBOSE){
				console.log(APPNAME+' IMPORTANT | No such process found! PID: '+pid+' starting bootstrap... ');
			}
			return bootstrap(id)
		}
});
}
// listen to process from pid
function listen(pid, id, obj){
try {
	setTimeout(function(){ 
		lookup(pid, id)
		console.log("> ");
	}, 100);

}catch(err) {
	throw new MyError(APPNAME+" CRITICAL | listen() has failed for PID: "+pid+" with process: "+ JSON.stringify(obj[id]));
}
}
// change directory to spwan new process
function changeDirectory(cwd){
	//console.log(APPNAME+' IMPORTANT | Starting directory: ' + process.cwd());
try {
	process.chdir(cwd);
	//console.log(APPNAME+' IMPORTANT | New directory: ' + process.cwd());
}
catch (err) {
	console.log(APPNAME+' CRITICAL | chdir: ' + err);
}
}
function sudo(command, args, id, obj,cwd, cb){
	var sudo = obj.process[id].credentials.sudo
	suppose(command, args, {debug: fs.createWriteStream(DEBUG)})
		.when('[sudo] password for ').respond(sudo)
	.on('error', function(err){
		console.log(err.message);
	})
	.end(function(code){
		console.log('sudo mode exited with code: '+code);

		return cb(process.pid)
})
}
function git(command, args, id, obj,cwd, cb){
	suppose(command, args, {debug: fs.createWriteStream(DEBUG)})
	var username = obj.process[id].credentials.username
	var password = obj.process[id].credentials.password
	suppose(command, args, {debug: fs.createWriteStream(DEBUG)})
		.when('Username for ').respond(username.trim())
		.when('Password for ').respond(username.trim())
	.on('error', function(err){
		console.log(err.message);
	})
	.end(function(code){
		console.log('git mode exited with code: '+code);
		return cb(process.pid)
	})
}
function passphrase(command, args, id, obj,cwd, cb){
	var passphrase = obj.process[id].credentials.passphrase
	suppose(command, args, {debug: fs.createWriteStream(DEBUG)})
		.when('Enter passphrase for key ').respond(passphrase.trim())
	.on('error', function(err){
		console.log(err.message);
	})
	.end(function(code){
		console.log('passphrase mode exited with code: '+code);
		return cb(process.pid)
	})
}
// use suppose to deal with credentials prompt
function startAuth(command, args, id, obj,cwd){
	var type =obj.process[id].credentials.type
	switch(type) {
		case "git":
			return git(command, args, id, obj, cwd, function(pid){
				console.log("startAuth git mode is done ")
				listen(pid, id, obj)
				})
		
		case "sudo":
			return sudo(command, args, id, obj, cwd, function(pid){
				console.log("startAuth git mode is done ")
				listen(pid, id, obj)
				})
			
		case "passphrase":
			return passphrase(command, args, id, obj, cwd, function(pid){
				console.log("startAuth passphrase mode is done ")
				listen(pid, id, obj)
				})
			
		default:
			throw new MyError(APPNAME+" CRITICAL | Authentication mode | Authentication type is not supported type: "+type);
}
}

// start to process and record pid
function start(command, args, id, obj,cwd){
	if (obj.process[id].authentication){
		return startAuth(command, args, id, obj,cwd)
	}
try {

	if(__dirname != cwd){
		changeDirectory( path.normalize(cwd))
		if(VERBOSE){
			console.log('Directory changed: '+process.cwd());
		}
	}
	
	const spawn = require('child_process').spawn;


	console.log(" start cmd: "+ '("'+command+'",'+args+')')
	//const cmd = spawn(command, args);
	var env = Object.create( process.env ) || Object.create(obj.process[id].env)
	const cmd = spawn(command, args, { detached: true, env: env});
	
	if (obj.process[id].stdout != null){
		var logStream = fs.createWriteStream(path.join(obj.root, obj.process[id].cwd, obj.process[id].stdout), {flags: 'a'});
		cmd .stdout.pipe(logStream)
	}
	if (obj.process[id].stderr != null){
		var logStream = fs.createWriteStream(path.join(obj.root, obj.process[id].cwd, obj.process[id].stderr), {flags: 'a'});
		cmd.stderr.pipe(logStream);
	}
			
	cmd.stdout.on('data', (data) => {
		if(VERBOSE){
			console.log(APPNAME+" IMPORTANT | process for "+cmd+" is PID: "+cmd.pid)
		}
		obj.process[id].pid = cmd.pid
		obj.process[id].status = true
		jsonfile.writeFile(RECOVERY, obj, function (err) {
			if(err){
				throw new MyError(APPNAME+" CRITICAL | Start command spawn failed with err: "+err.message);
			}
			if(VERBOSE){
				console.log("> "+obj.process[id].pid +' | log: ' + data+" \n > SUCCESS "+ 200);
			}
			if(obj.process[id].listen == true){
				listen(cmd.pid, id, obj)
			}
			
		})
	});

	cmd.stderr.on('data', (data) => {
		if(VERBOSE){
			console.log("> "+obj.process[id].pid +' | err: ' + data+" \n > ERROR "+ 403);
		}
	});

	cmd.on('close', (code) => {
		obj.process[id].pid = null
		obj.process[id].status = false
		jsonfile.writeFile(RECOVERY, obj, function (err) {
			if(err){
				throw new MyError(err.message);
			}
			if(VERBOSE){
				console.log(APPNAME+" IMPORTANT | SPAWN "+obj.process[id].pid +" exited with code: "+ code);
			}
		})
	});
}catch(err) {
	throw new MyError(APPNAME+" CRITICAL | Start command has failed for "+'("'+command+'",'+args+') with err: '+err);
}
}

//constructor sections
/////////////////////////////////////////////////////////////////
function deploy(program){
try {
	this.root = program.root || path.normalize(path.dirname(__dirname))
	this.os = process.platform 
	this.verbose = program.verbose || false
	this.process = program.process || []
}catch(err) {
	throw new MyError(APPNAME+" CRITICAL | setup constructor has failed err: "+err);
}
}

function watcher(options, root){
try {

	this.stdout = options.stdout || null
	this.stderr = options.stderr || null
	this.listen = options.listen || true
	this.cwd =  path.join(root, options.cwd) || path.normalize(root) 
	this.ttl= options.ttl || 100
	this.pid = null
	this.status = false
	if(options.makefile){
		fs.stat(options.makefile, function(err, stat) {
			if(err == null) {
				this.makefile = options.makefile
			}else{
				throw new MyError(APPNAME+" CRITICAL | makeFile path is not valid file: "+options.makefile);
			}
		}); 
	}
	if(options.dependencies){
		this.dependencies = options.dependencies
	}
	if (options.dependencies == null){
		this.dependencies = 'node_modules' 
	}
	this.reinstall = options.reinstall || false
	if(options.cmd){
		this.cmd = options.cmd
	}else{
		throw new MyError(APPNAME+" CRITICAL | You fill the command value in config or in add command ");
	}

}catch(err) {
		throw new MyError(APPNAME+" CRITICAL | process constructor has failed");
}
}

// PROGRAM commands
/////////////////////////////////////////////////////////////////
program
	.version('0.0.1')
	.description('Welcome to lunchjs commandline tool for ligth process boostrapping ')
	
// node lunchjs add -c "node index -h" -v
program
	.command('add')
	.description('add a new process to be watched')
	.usage('node index add -c <command>')
	.option('-r, --root <path>', 'change the rootdirectory', path.resolve(__dirname))
	.option('-C, --cwd <path>', 'change the working directory', "/")
	.option('-c, --cmd [String]', 'Array of command and args', null)
	.option('-d, --dependencies [String]', 'Dependencies file', null)
	.option('-r, --reinstall [mode]', 'Set to re-install dependencies ', false)
	.option("-m, --makefile [path]", "path to a makefile to install dependencies", null)
	.option("-t, --ttl [milliseconds]", "time in milliseconds for the pid lookup cycle", 100)
	.option("-l, --listen [boolean]", "Set the process to be listened to and boostrapped, make false to run only once", true)
	.option('-v, --verbose', 'Set to verbose ')
	.action(function(options){
		console.log("*********************************")
		console.log("*            Lunchjs            *")
		console.log("*                               *")
		console.log("* Author: Jean-Philippe Beaudet *")
		console.log("* Version: 0.0.1                *")
		console.log("* License:GPL-3.0               *")
		console.log("*                               *")
		console.log("*        ADD new process        *")
		console.log("*                               *")
		console.log("*            Adding  ...        *")
		console.log("*                               *")
		console.log("*********************************")
		VERBOSE = (options.verbose != null)
		fs.stat(RECOVERY, function(err, stat) {
			if(err == null) {
				jsonfile.readFile(RECOVERY, function(err, obj) {
					if (obj != null){
						var p = new watcher(options, obj.root)
						obj.process.push(p)
						jsonfile.writeFile(RECOVERY, obj, function (err) {
							if(err){
								throw new MyError("writing new process has failed");
							}
						var opt = {
							keysColor: 'green',
							noColor: true
							
						};
						if(VERBOSE){
							console.log(APPNAME+' ADD | new command succesfully added :' )
							console.log(prettyjson.render(obj, opt));
						}
						})
					}
				})
			}else{
				throw new MyError(APPNAME+" CRITICAL | you must run setup or config command before adding process to be listened");
			}
		})
	});
	
// node lunchjs config -p "./config.js" -v
program
	.command('config')
	.description('use a config file for the deployment')
	.usage('node index config -p <path/to/config.js>')
	.option('-p, --path [String]', 'path to use a config file, default to '+path.join(__dirname,"/config.json"))
	.option('-v, --verbose', 'Set to verbose ')
	.action(function(options){
		console.log("*********************************")
		console.log("*            Lunchjs            *")
		console.log("*                               *")
		console.log("* Author: Jean-Philippe Beaudet *")
		console.log("* Version: 0.0.1                *")
		console.log("* License:GPL-3.0               *")
		console.log("*                               *")
		console.log("* Read process from config file *")
		console.log("*                               *")
		console.log("*         Configuring...        *")
		console.log("*                               *")
		console.log("*********************************")
		VERBOSE = (options.verbose != null)
		var config_path= path.join( __dirname,"/config.js")
		if(options && options.path){
			 config_path = options.path
		}
		fs.stat(config_path, function(err, stat) {
			if(err == null) {
				CONFIG = require(config_path)
				var opt = {
					keysColor: 'green',
					noColor: true
				};
				PROC = new deploy(CONFIG)
				if(VERBOSE){
					console.log(APPNAME+' config had been read with:' )
					console.log(prettyjson.render(PROC, opt));
				}
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
				//if (VERBOSE){
					//console.log(APPNAME+' PROC created: '+JSON.stringify(PROC))
				//}
				})
			}else{
				throw new MyError(APPNAME+" CRITICAL | RECOVERY file path is invalid: "+RECOVERY);
			}
		});
	});
	
// node lunchjs start -v
program
	.command('start')
	.description('start all process ')
	.usage('node index start -v')
	.option('-v, --verbose', 'Set to verbose ')
	.action(function(options){
		console.log("*********************************")
		console.log("*            Lunchjs            *")
		console.log("*                               *")
		console.log("* Author: Jean-Philippe Beaudet *")
		console.log("* Version: 0.0.1                *")
		console.log("* License:GPL-3.0               *")
		console.log("*                               *")
		console.log("* Starting processes ...        *")
		console.log("*                               *")
		console.log("*********************************")
		VERBOSE = (options.verbose != null)
		fs.stat(RECOVERY, function(err, stat) {
			
			if(err == null) {
				jsonfile.readFile(RECOVERY, function(err, obj) {
					if (obj != null){
						const  cmd =[]
						for (var i = 0; i < obj.process.length; i++) {
							var exec = new getCommand(obj.process[i].cmd)
								start(exec.command, exec.args, i, obj, path.join(obj.root, obj.process[i].cwd))
						}
					}
				});
			}
		})
	})
	
// node lunchjs setup -v
program
	.command('setup')
	.description('add a new process to be watched')
	.option('-rr, --root', 'Set new root file ', path.normalize(path.dirname(__dirname)))
	.option('-v, --verbose', 'Set to verbose ')
	.action(function(options){
		console.log("*********************************")
		console.log("*            Lunchjs            *")
		console.log("*                               *")
		console.log("* Author: Jean-Philippe Beaudet *")
		console.log("* Version: 0.0.1                *")
		console.log("* License:GPL-3.0               *")
		console.log("*                               *")
		console.log("*    New process object ready   *")
		console.log("*                               *")
		console.log("*********************************")
		VERBOSE = (options.verbose != null)
		PROC = new deploy(options)
		jsonfile.writeFile(RECOVERY, PROC, function (err) {
			if(err){
					throw new MyError(err.message);
				}
		var opt = {
			keysColor: 'green',
			noColor: true
		};
		if(VERBOSE){
			console.log(APPNAME+' process object refreshed:' )
			console.log(prettyjson.render(PROC, opt));
		}
		})
	})
	
// node lunchjs ls
program
	.command('ls')
	.description('get current process configurations')
	.action(function(options){
		fs.stat(RECOVERY, function(err, stat) {
			
			if(err == null) {
				jsonfile.readFile(RECOVERY, function(err, obj) {
					var opt = {
						keysColor: 'green',
						noColor: true
					};
					console.log(prettyjson.render(obj, opt));
				})
			}
			})
	})
	
// node lunchjs save
program
	.command('save')
	.option('-p, --path', 'path to save file ')
	.description('save current process configuration')
	.action(function(options){
		var save = options.path || path.join(__dirname+'/bin/save.js')
		fs.stat(RECOVERY, function(err, stat) {
			console.log(save)
			if(err == null) {
				jsonfile.readFile(RECOVERY, function(err, obj) {
					if (obj != null){
						var opt = {
							keysColor: 'green',
							noColor: true
						};
						jsonfile.writeFile(save, obj, function (err) {
							if(err){
								throw new MyError(err.message);
							}
							console.log(APPNAME+'SAVE SUCCESS saving process configuration to: ' +save)
							console.log(prettyjson.render(obj, opt));
						})
					}else{
						throw new MyError(APPNAME+'SAVE ERROR | you must have a valid process configuration to save');
					}
				})
			}
		})
	})
	// parse the args
	/////////////////////////////////////////////////////////////////////////
	program.parse(process.argv);
