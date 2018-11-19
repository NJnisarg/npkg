

// Function to the list of immediate dependencies( level - 1) for a given package
// Takes an API call to fetch the list of dependencies.
const getDependencyList = async ({pkgName, version}) => {

    // First resolve the pinpoint version of the package to download
    let ver = await resolveVersion({pkgName,version});
    try {
        // get the list of dependencies for the package.
        let response = await axios({
            url: baseRegistryUrl + `/${pkgName}/${ver}`,
            type: 'GET',
            responseType: 'json'
        });
        if(response.data.dependencies===null || response.data.dependencies===undefined)
        {
            return [];
        }

        // Returns the first level of dependencies
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