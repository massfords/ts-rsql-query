# The default npm lib path.
DEFAULT_NPM_LIB_PATH:=./dist

# The package name
PACKAGE:=$(shell bash -c "cat package.json | jq '.name'")

# The package version used for Git tagging etc.
VERSION:=$(shell bash -c "cat package.json | jq '.version'")

# Pack npm package.
pack:
	@printf "*******************************************************************************\n"
	@printf "* Create package out of ${DEFAULT_NPM_LIB_PATH}.\n"
	@printf "*******************************************************************************\n"
	npm run lint && npm test
	npm pack --ignore-scripts

# Publish npm package and cleanup created artifact.
publish: pack
	@printf "*******************************************************************************\n"
	@printf "* Publish ${PACKAGE}@${VERSION}.\n"
	@printf "*******************************************************************************\n"
	npm publish $(shell bash -c "find ${DEFAULT_NPM_LIB_PATH} -name '*.tgz'") --ignore-scripts
	rm -rf ./${PACKAGE}-${VERSION}.tgz

# Execute tests with coverage.
tc:
	@printf "*******************************************************************************\n"
	@printf "* Running tests with coverage.\n"
	@printf "*******************************************************************************\n"
	npm run test:coverage

# Execute tests with live-DB.
tl:
	@printf "*******************************************************************************\n"
	@printf "* Running tests with live-DB.\n"
	@printf "*******************************************************************************\n"
	npm run it
