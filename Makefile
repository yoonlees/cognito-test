.PHONY: all build deploy clean

all: build deploy

build:
	npm run build

deploy:
	aws s3 sync --delete build/ s3://cloudfront-content-public-us-east-2-224588347132/49cd-directory-editor-tf.as-test.techservices.illinois.edu

clean:
	-rm -rf build
