'use strict';

const AWS = require('aws-sdk');
const WalletService = require('./walletService.js');
const uuidvalidator = require('uuid-validate');
const eventsToWatch = [
    'order.created'
];
let dynamoDb;

//Set dynamoDbEndpoint if it exists
if (process.env.dynamoDbEndpoint) {
	console.log('*** Manually setting dynamoDb config');
	dynamoDb = new AWS.DynamoDB({ accessKeyId: 'headly48', secretAccessKey: '123', region: 'us-west-2', endpoint: new AWS.Endpoint(process.env.dynamoDbEndpoint) });
} else {
	dynamoDb = new AWS.DynamoDB();
}

let walletService = new WalletService(dynamoDb, process.env.WALLET_TABLE);

module.exports.orderCreated = (event, context, callback) => {	
	const list = event.Records;

	const iteratee = (record, cb) => {
  
	  // Kinesis data is base64 encoded so decode here
	  let retrievedRecord = new Buffer(record.kinesis.data, 'base64').toString();
	  let universityInfo = JSON.parse(retrievedRecord);
	  console.log('Pushing to algolia: ' + universityInfo.name + universityInfo.course.name);
  
	 
	};
  
	eachOf(list, iteratee, function(err) {
	  if (err) callback(err);
  
	  callback(null, "Number of records pushed to algolia : " + list.length);
	});
};

module.exports.getWallet = (event, context, callback) => {
	if (!event.cognitoPoolClaims || !event.cognitoPoolClaims.email) {
		console.log(JSON.stringify(event));
		return callback(null, { statusCode: 400, body: { message: 'Não foi possível obter o e-mail ' } });		
	}
	var email = event.cognitoPoolClaims.email;
	
	walletService.getWalletId(email).then(data => {
		if (!data) {
			return walletService.createWallet(email);
		} else {
			return walletService.getWallet(data);
		}
	}).then(data => {		
		callback(null, data);
	}).catch(function (error) {
		console.log("getWallet - " + JSON.stringify({ error: error }));
		callback(JSON.stringify({ error: error }));
	});
};

