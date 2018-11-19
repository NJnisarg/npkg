# npkg
The package manager for nodejs environment

---

## Usage
- Clone the repository
- Go to the cloned repository.
- The main file is index.js
- This supports a few commands as of now.
  - node index init --> to init the package manager. Adds the npkg.json and npkg-lock.json files
  - node index install pkgName=semverString  --> Downloads the package with the given name and all its dependencies.
  - node index install  --> Installs all the packages in the npkg.json file.
- The npkg in the current state of development downloads the packages in a new directory called 'npkg_modules'

## Author
- Nisarg S. Joshi
