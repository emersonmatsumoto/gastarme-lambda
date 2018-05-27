Gastar.me Backend
===================================================

## Wallet API
![Wallet API](/doc/wallet.png)

## Credit Card API
![Credit card API](/doc/cc.png)

## Order API
![Order API](/doc/order.png)

### Required Tools
* [aws cli](http://docs.aws.amazon.com/cli/latest/userguide/installing.html)
* [npm](https://www.npmjs.com/)

## Setup
##### Install the required tools 
* Create an AWS account
* Install [npm](https://www.npmjs.com/)
* [Install or update your aws cli](http://docs.aws.amazon.com/cli/latest/userguide/installing.html) 
* Install [serverless](https://serverless.com/framework/docs/providers/aws/guide/installation/)

## Build and Deploy

```
# Clone it from github
git clone --depth 1 https://github.com/emersonmatsumoto/gastarme-lambda.git
```
```
# Install the NPM packages
cd gastarme-lambda
npm install
```
```
# Deploy 
sls deploy --stage prod
```
