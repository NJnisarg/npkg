

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