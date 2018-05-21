'use strict';

const AWS = require('aws-sdk');
const OrderService = require('./orderService.js');
const CreditCardService = require('./creditCardService.js');
const WalletService = require('./walletService.js');
const uuidvalidator = require('uuid-validate');
const eventsToWatch = [
    'order.created'
];
let dynamoDb;
let dynamoDbWallet;
let dynamoDbCreditCard;

//Set dynamoDbEndpoint if it exists
if (process.env.dynamoDbEndpoint) {
	console.log('*** Manually setting dynamoDb config');
	dynamoDb = new AWS.DynamoDB({ accessKeyId: 'headly48', secretAccessKey: '123', region: 'us-west-2', endpoint: new AWS.Endpoint(process.env.dynamoDbEndpoint) });
	dynamoDbWallet = new AWS.DynamoDB({ accessKeyId: 'headly48', secretAccessKey: '123', region: 'us-west-2', endpoint: new AWS.Endpoint(process.env.dynamoDbEndpoint) });
	dynamoDbCreditCard = new AWS.DynamoDB({ accessKeyId: 'headly48', secretAccessKey: '123', region: 'us-west-2', endpoint: new AWS.Endpoint(process.env.dynamoDbEndpoint) });
} else {
	dynamoDb = new AWS.DynamoDB();
	dynamoDbWallet = new AWS.DynamoDB();
	dynamoDbCreditCard = new AWS.DynamoDB();
}

let orderService = new OrderService(dynamoDb, process.env.ORDER_TABLE);
let walletService = new WalletService(dynamoDbWallet, process.env.WALLET_TABLE);
let creditCardService = new CreditCardService(dynamoDbCreditCard, process.env.CREDITCARD_TABLE);

module.exports.listOrder = (event, context, callback) => {
	context.callbackWaitsForEmptyEventLoop = false;
	
	if (!event.cognitoPoolClaims || !event.cognitoPoolClaims.email) {
		console.log(JSON.stringify(event));
		return callback(null, { statusCode: 400, body: { message: 'Não foi possível obter o e-mail ' } });		
	}
	
	let email = event.cognitoPoolClaims.email;
	
	walletService.getWalletId(email)
	.then(id => {
		if (!id) {
			console.log(id);
			callback(null, { statusCode: 404, body: { message: `Não existe wallet para ${email}`}});			
		}
		return orderService.list(id);
	}).then(data => {
		callback(null, data);
	}).catch(error => callback(JSON.stringify({ error: error })));
		
};

module.exports.createOrder = (event, context, callback) => {
	if (!event.cognitoPoolClaims || !event.cognitoPoolClaims.email) {
		console.log(JSON.stringify(event));
		return callback(null, { statusCode: 400, body: { message: 'Não foi possível obter o e-mail ' } });		
	}
	
	let email = event.cognitoPoolClaims.email;
	let requestBody = event.body;

	if (!requestBody.description || !requestBody.total) {
		console.log(JSON.stringify(requestBody));
		return callback(null, { statusCode: 400, body: JSON.stringify({ error: 'Todos os campos são obrigatórios' }) });
	}
	
	walletService.getWalletId(email)
	.then(id => {
		if (!id) {
			console.log(id);
			callback(null, { statusCode: 404, body: { message: `Não existe wallet para ${email}`}});			
		}

		return walletService.getWallet(id);
	}).then(wallet => {
		if(!wallet || wallet.limit < requestBody.total) {
			return callback(null, { statusCode: 400, body: { message: `Limite menor que o valor da compra`}});									
		}

		return creditCardService.listCreditCard(wallet.id);
	}).then(creditCards => {
		let total = requestBody.total;
		let promises = [];
		
		creditCards.sort(
			function(a, b)
			{
				if (a.paydayDate < b.paydayDate) {            // a comes first
					return -1
				} else if (b.paydayDate < a.paydayDate) {     // b comes first
					return 1
				} else {                // equal, so order is irrelevant					
					return a.limit - b.limit            // note: sort is not necessarily stable in JS
				}
			}
		);
		
		for (let creditCard of creditCards) {
			if (total === 0) {
				break;
			}
			if (total > creditCard.limit) {
				requestBody.total = creditCard.limit;
				total -= creditCard.limit;
			} else {
				requestBody.total = total;
			}
			requestBody.walletId = creditCard.walletId;
			requestBody.creditCardId = creditCard.id;
			requestBody.date = new Date().toISOString();
			promises.push(orderService.create(requestBody));
			promises.push(walletService.updateAvailableCredit(creditCard.walletId, total));
		}

		return Promise.all(promises);
	}).then(data => {		
		callback(null, { statusCode: 201, body: "" });
	}).catch(error => {
		console.log('Error creating order. ' + error);
		callback(JSON.stringify({ error: error }));
	});
};

