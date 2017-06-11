# lunchjs
----
##### Version 0.0.3
##### Author: Jean-Philippe Beaudet
##### License: GPL-3.0
##### Notes: 
NOT production ready, this is a pre-release and work-in-progress
While the CLI works fine on my windows (cygwin) and ubuntu 16.10, it had NOT been tested for stress tests on any other platform yet.

### Description
nodejs CLI to launch multiple application and process, handle deployment, dependencies installation. It also listen to PID and will restart on process fail

### Installation 
````
npm install lunchjs
````

## Usage
----

#### You can use a configuration file of your owns or modify this one
the configuration will be parsed to configure your watchers

````
// config.js

var Config = {
	root: path.normalize(path.dirname(__dirname)),
	verbose: true,
	os: null,
	process: [
		{
			cmd: "node lunchjs -h", // * required
			listen: true, // set to true to listen to pid, false to run once
			pid: null,
			env: null, // pass env variables default to process.env instance
			ttl: 100, // time to lookup for pid default to 100
			status: false, 
			makefile: null, // set to path anme to use makefile
			reinstall : true, // flag true to re-install dependencies on restart
			dependencies: null, // dependencies file null if reinstall is false
			cwd: "/deployjs", // current working directory endpoint default to /
			stdout: "/bin/debug.txt", // optional stdout file to save output
			stderr: "/bin/debug.txt", // optional stderr file to save output
			authentication: false, // flag true to use credentials for git, sudo, pasphrase (enter relevent credentials)
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

````

##### then
````
node lunchjs start -v
````

#### Or use the command-line add command
````
node lunchjs setup

// add has many default only -c is enforced
node lunchjs add -c "your command" -v

//but you can use all options at once too
node lunchjs add -c "your command" -r "new root path for process " -C "working/directory" -d "node_modules" -r true -m "my/makefile/path" -t 200

node lunchjs start -v
````

#### Other commands
````
// show current configuration file
node lunchjs ls

// save current cprocess configuration to file
node lunchjs save -p "my/path"

// see comand help 
node lunchjs -h
````
