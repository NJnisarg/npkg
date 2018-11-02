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

const resolveDependencies = async({pkgName,version}) => {
    // Takes the name of the source Package, version and the List of dependencies
    // Generates a final list of all the flat resolved dependencies
    // dependencyList is an array of objects of the format {pkgName,version}

    let dList = [];
    let q = new Q();
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

const downloadPkg = async ({pkgName,version}) => {

    // Pass the name of the package and the version and it will download the package from the npm-registry
    // Downloads a .tgz file
    let ver = await resolveVersion({pkgName,version});
    try{
        let response = await axios({
            method:"GET",
            url:baseRegistryUrl + `/${pkgName}/-/${pkgName}-${ver}.tgz`,
            responseType:'stream'
        });
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
                            console.log(err);
                        else{
                            rimraf.sync(`npkg_modules/${pkgName}-${ver}/`);
                            rimraf.sync(`${pkgName}-${ver}.tgz`)
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



async function display() {

    let args = process.argv.splice(2);

    if(args[0] === 'install') {
        let new_args = args[1].split('=');
        console.log(new_args);
        let pkgName = new_args[0];
        let version = new_args[1];


        let dList = await resolveDependencies({pkgName, version});
        try {
            console.log(dList.length);

            dList.forEach(dependency => {
                downloadPkg(dependency);
            })

        }
        catch (err) {
            console.log(err);
        }
    }
}

display();