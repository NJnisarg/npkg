// Dependencies

const targz = require('targz');
const mv = require('mv');
const rimraf = require('rimraf');
const fs = require('fs');
const semver = require('semver');
const axios = require('axios');
const Q = require('queue-fifo');
const _ = require('lodash');

// Global Constants
const baseRegistryUrl = 'https://registry.npmjs.org';

// The function to check if the npkg.json file is init or not. Does the check synchronously
const isInit = () => {
    return fs.existsSync('npkg.json');
};


// The function to initialize the npkg.json file
const init = async () => {
    let initData = {
        name:"",
        version: "1.0.0",
        description:"",
        author:"",
        dependencies:{}
    };
    fs.appendFile('npkg.json', JSON.stringify(initData, null, 4), (err) => {
        if(err)
            console.log(err);
        else
            console.log("npkg File initialized!");
    });

    let lockFileData = {
        dependencies:{}
    };

    fs.appendFile('npkg-lock.json', JSON.stringify(lockFileData, null, 4), (err) => {
        if(err)
            console.log(err);
        else
            console.log("npkg lock file initialized!")
    })
};

// Function to resolve a version number using the semver versioning standards
const resolveVersion = async ({pkgName,version}) => {

    // The function returns the maxSatisfying version that can be downloaded, if the version string cannot match the criteria
    // it returns null as a value

    // If we find the version to be of the form ~1.0.x or ^1.x and not an exact version number like 1.0.4
    // Then we will get the package with the latest version and satisfying validRange criteria.

    // If semver.valid is not null , i.e , the version is an exact version then return the exact version for download
    // If the version is not valid the return null
    let versions = [];

    let response = await axios.get(baseRegistryUrl+`/${pkgName}`);
    try{
        versions = response.data.versions;
        versions = Object.keys(versions);

        if(semver.validRange(version) && !semver.valid(version))
        {
            let i=0;
            let maxSatisfying = semver.maxSatisfying(versions, version);
            for(i=0;i<versions.length;i++)
            {
                if(versions[i] ===  maxSatisfying)
                    return maxSatisfying;
            }
            return null;
        }
        if(semver.valid(version) !== null)
        {
            let i=0;
            for(i=0;i<versions.length;i++)
            {
                if(versions[i] ===  version)
                    return version;
            }
            return null;
        }
        else
            return null;
    }
    catch(err)
    {
        return null;
    }
};


// Function to the list of immediate dependencies( level - 1) for a given package
const getDependencyList = async ({pkgName, version}) => {
    let ver = await resolveVersion({pkgName,version});
    try {
        let response = await axios({
            url: baseRegistryUrl + `/${pkgName}/${ver}`,
            type: 'GET',
            responseType: 'json'
        });
        if(response.data.dependencies===null || response.data.dependencies===undefined)
        {
            return [];
        }
        let dList = Object.entries(response.data.dependencies).map(([k, v]) => {
            try{
                return ({pkgName: k, version: v});
            }
            catch(err)
            {
                return [];
            }
        });

        return dList;
    }
    catch(err)
    {
        console.log(err);
    }


};

// The function to resolve the complete dependency graph for a single package
// Returns the flat dependency list
const resolveDependencies = async({pkgName,version}) => {
    // Takes the name of the source Package, version and the List of dependencies
    // Generates a final list of all the flat resolved dependencies

    // Uses Breath First search to probe all the possible dependencies to a package given.
    // Uses the BFS algorithm in an iterative fashion

    // dList is the final flat dependency List that is formed. blackList is the package that is already explored
    // grayList is the package in the Queue that is being processed. The Queue is a FIFO Queue.

    let q = new Q();

    let dList = [];
    let blackList = [];
    let grayList = [];

    q.enqueue({pkgName,version});

    while(!q.isEmpty())
    {
        grayList.push(q.peek().pkgName);
        let dependencyList = await getDependencyList(q.peek());
        dependencyList.forEach(dependency => {
            if((_.includes(blackList, dependency.pkgName)) || (_.includes(grayList, dependency.pkgName))){
                return;
            }
            q.enqueue(dependency);
            grayList.push(dependency.pkgName);
        });

        console.log(q.peek());
        dList.push(q.peek());
        grayList.splice(grayList.indexOf(q.peek().pkgName),1);
        blackList.push(q.peek().pkgName);
        q.dequeue();

    }

    return dList;

};

// Downloads a single package at a time with a given name and version
const downloadPkg = async ({pkgName,version}) => {

    // Pass the name of the package and the version and it will download the package from the npm-registry
    // Downloads a .tgz file

    // Resolves the correct version
    let ver = await resolveVersion({pkgName,version});

    // API call to the registry
    try{
        let response = await axios({
            method:"GET",
            url:baseRegistryUrl + `/${pkgName}/-/${pkgName}-${ver}.tgz`,
            responseType:'stream'
        });

        // Pipe the contents to the tarball on disk. The uses targz to decompress and save it.
        let downloading = response.data.pipe(fs.createWriteStream(`${pkgName}-${ver}.tgz`));
        downloading.on('finish',  () => {
            targz.decompress({
                src: `${pkgName}-${ver}.tgz`,
                dest: `npkg_modules/${pkgName}-${ver}`
            }, (err) => {
                if(err)
                    console.log(err);
                else{
                    mv(`npkg_modules/${pkgName}-${ver}/package`,`npkg_modules/${pkgName}`, (err) => {
                        if(err)
                        {
                            if(err.code==='ENOTEMPTY')
                            {
                                rimraf.sync(`npkg_modules/${pkgName}/`);
                                mv(`npkg_modules/${pkgName}-${ver}/package`,`npkg_modules/${pkgName}`, (err) => {
                                    if(!err)
                                    {
                                        rimraf.sync(`npkg_modules/${pkgName}-${ver}/`);
                                        rimraf.sync(`${pkgName}-${ver}.tgz`);
                                    }

                                });
                            }
                            else
                                console.log(err.code);
                        }
                        else{
                            // Removes the tarball and the extra package
                            rimraf.sync(`npkg_modules/${pkgName}-${ver}/`);
                            rimraf.sync(`${pkgName}-${ver}.tgz`);
                        }
                    })
                }
            });
        });
    }
    catch(err)
    {
        console.log(err);
    }

};

const addToNpkg = async ({pkgName,version}) => {
    fs.readFile('npkg.json','utf8', (err, data) => {
        if(err)
            console.log(err);
        else
        {
            let fileContents = JSON.parse(data);
            fileContents.dependencies[pkgName] = version;
            fs.writeFile('npkg.json', JSON.stringify(fileContents,null,4), (err)=> {
                if(err)
                    console.log(err);
                else
                    console.log("npkg file updated with the package");
            })
        }
    })
};

const addToNpkgLock = async (diff) => {
    fs.readFile('npkg-lock.json','utf8', (err, data) => {
        if(err)
            console.log(err);
        else
        {
            let fileContents = JSON.parse(data);
            diff.forEach((item) => {
                fileContents.dependencies[item.pkgName] = item.version;
            });

            fs.writeFile('npkg-lock.json', JSON.stringify(fileContents,null,4), (err)=> {
                if(err)
                    console.log(err);
                else
                    console.log("npkg-lock file updated with the package");
            })
        }
    })
};

const getCurrentDList = () => {
    let data = fs.readFileSync('npkg.json','utf8');

    let fileContents = JSON.parse(data);
    let dList = fileContents.dependencies;

    let currentDList = [];
    Object.keys(dList).forEach(key => {
        currentDList.push({ pkgName:key, version:dList[key]})
    });
    return currentDList;
};

const execnpkg = async() => {

    // Get the list of arguments after the first 2 arguments.
    // For now the command to run is of the form "node index xyz"
    // The below line extracts arguments from "xyz" onwards
    let args = process.argv.splice(2);

    // Checking if the npkg is initialized or not.
    // If not then we force them to initialization
    if(!isInit() && args[0] !=='init')
    {
        console.log("npkg not initialized. Please use the command node index init.");
        process.exit();
    }
    else if(!isInit() && args[0] === 'init')
    {
        init();
    }
    else if(isInit() && args[0] === 'init')
    {
        console.log("Fucker its already initialized!");
    }

    // The code segment that handles the command "node index install packageName=semverString"
    if(args[0] === 'install' && args[1]!==undefined) {
        let new_args = args[1].split('=');
        let pkgName = new_args[0];
        let version = new_args[1];

        // getCurrentDList checks the npkg.json file to get the list of top level packages
        let currentDependencies = getCurrentDList();
        try{
            if(_.some(currentDependencies,{pkgName,version})) {
                console.log("Package already exists with the same version");
                return;
            }
        }
        catch(err){
            console.log(err);
        }

        let dList = await resolveDependencies({pkgName, version});

        try {
            dList.forEach(dependency => {
                downloadPkg(dependency);
            });
            addToNpkg({pkgName, version});
            addToNpkgLock(dList);

        }
        catch (err) {
            console.log(err);
        }
    }
    else if(args[0]==='install' && args[1]===undefined)
    {
        // getCurrentDList checks the npkg.json file to get the list of top level packages
        let currentDependencies = getCurrentDList();

        currentDependencies.forEach(async (dependency) => {
            let dList = await resolveDependencies(dependency);

            try {
                dList.forEach(dependency => {
                    downloadPkg(dependency);
                });
            }
            catch (err) {
                console.log(err);
            }
        });
    }
};

// Helper function to run the program.
// Will be replaced with a better function in production env
async function display() {
    execnpkg();
}

display();