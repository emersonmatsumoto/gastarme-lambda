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


module.exports.createWallet = (event, context, callback) => {
	if (!event.cognitoPoolClaims || !event.cognitoPoolClaims.email) {
		console.log(JSON.stringify(event));
		return callback(JSON.stringify({ statusCode: "[400]", errorMessage: 'Não foi possível obter o e-mail ' }));		
	}
	var email = event.cognitoPoolClaims.email;
	
	walletService.create(email).then(data => {		
		callback(null, data);
	}).catch(function (error) {
		console.log("createWallet - " + JSON.stringify({ error: error }));
		callback(JSON.stringify({ statusCode: "[400]", errorMessage: error }));
	});
};

module.exports.getWallet = (event, context, callback) => {
	if (!event.cognitoPoolClaims || !event.cognitoPoolClaims.email) {
		console.log(JSON.stringify(event));
		return callback(JSON.stringify({ statusCode: "[400]", errorMessage: 'Não foi possível obter o e-mail ' }));		
	}
	var email = event.cognitoPoolClaims.email;
	
	walletService.get(event.path.id).then(data => {		
		if (data.email != email) {
			console.log("getWallet - " + JSON.stringify({ error: data }));
			callback(JSON.stringify({ statusCode: "[403]", errorMessage: "Proibido" }));		
		} else {
			callback(null, data);
		}
	}).catch(function (error) {
		console.log("getWallet - " + JSON.stringify({ error: error }));
		callback(JSON.stringify({ statusCode: "[400]", errorMessage: error }));
	});
};

module.exports.listWallet = (event, context, callback) => {
	if (!event.cognitoPoolClaims|| !event.cognitoPoolClaims.email) {
		console.log(JSON.stringify(event));
		return callback(JSON.stringify({ statusCode: "[400]", errorMessage: 'Não foi possível obter o e-mail ' }));	
	}
	console.log(JSON.stringify(event))
	if (event.query.all){
		walletService.listAll().then(data => {		
			callback(null, data);
		}).catch(function (error) {
			console.log("getWallet all - " + JSON.stringify({ error: error }));
			callback(JSON.stringify({ error: error }));
		});
	} else {
		var email = event.cognitoPoolClaims.email;
	
		walletService.list(email).then(data => {		
			callback(null, data);
		}).catch(function (error) {
			console.log("getWallet - " + JSON.stringify({ error: error }));	
			callback(JSON.stringify({ statusCode: "[400]", errorMessage: error }));
		});
	}
	
};


