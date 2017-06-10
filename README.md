# lunchjs
----
##### Version 0.0.1
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

#### Use the config.js file or your own configuration file
````
var Config = {
	root: <your/root/path>,
	verbose: true,
	process: [ // add as many process as you wish, they will be resolved in order of precedence
		{
			cmd:<command>,
			pid: null,
			ttl:100,
			status: false,  
			makefile: null, // set to file path to use makefile
			reinstall : false, // set to true to re-install dependencies on restart
			dependencies: null,// dependency directory default to node_modules
			cwd: "/deployjs" , // current working directory (from root) to execute the process
			authentication: false, // set to true to use credentials for process prompt
			credentials:{
				type: null , // set type : passphrase, sudo, git
				username: null, // set relevent credentials
				password: null,
				sudo: null,
				passphrase: null
			}
		}
	]
}
module.exports = Config;
````

#### Use the command-line add
````
node lunchjs setup

node lunchjs add -c "your command" -r "new root path for process " -C "working/directory" -d "node_modules" -r true -m "my/makefile/path" -t 200

node lunchjs start
````

#### for help
````
node lunchjs -h
````
