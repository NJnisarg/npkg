

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