// Dependencies
const fs = require('fs');
const semver = require('semver');
const axios = require('axios');
const Q = require('queue-fifo');
const _ = require('lodash');

// Global Constants
const baseRegistryUrl = 'https://registry.npmjs.org';


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
        response.data.pipe(fs.createWriteStream(`${pkgName}-${ver}.tgz`));
    }
    catch(err)
    {
        console.log(err);
    }

};

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
    try{
        let response = await axios({
            url:baseRegistryUrl+`/${pkgName}/${ver}`,
            type:'GET',
            responseType:'json'
        });
    }


};

const resolveDependencies = async({pkgName,version,dependencyList}) => {
    // Takes the name of the source Package, version and the List of dependencies
    // Generates a final list of all the flat resolved dependencies
    // dependencyList is an array of objects of the format {pkgName,version}

    let dList = [];
    let q = new Q();
    let blackList = [];

    q.enqueue(pkgName);
    blackList.push(pkgName);

    while(!q.isEmpty())
    {
        dependencyList.forEach(dependency => {
            if(!(_.includes(blackList, dependency))){
                q.enqueue(dependency);
            }
        });
        dList.push(q.peek());
        q.dequeue();
    }

    return dList;

};

async function display() {
    downloadPkg({pkgName:'react',version:'15.6.1'})
}

display();