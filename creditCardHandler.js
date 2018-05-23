'use strict';

const AWS = require('aws-sdk');
const CreditCardService = require('./creditCardService.js');
const WalletService = require('./walletService.js');
const OrderService = require('./orderService.js');
const uuidvalidator = require('uuid-validate');
const eventsToWatch = [
    'order.created'
];
let dynamoDb;
let dynamoDbWallet;
let dynamoDbOrder;

//Set dynamoDbEndpoint if it exists
if (process.env.dynamoDbEndpoint) {
	console.log('*** Manually setting dynamoDb config');
	dynamoDb = new AWS.DynamoDB({ accessKeyId: 'headly48', secretAccessKey: '123', region: 'us-west-2', endpoint: new AWS.Endpoint(process.env.dynamoDbEndpoint) });
	dynamoDbWallet = new AWS.DynamoDB({ accessKeyId: 'headly48', secretAccessKey: '123', region: 'us-west-2', endpoint: new AWS.Endpoint(process.env.dynamoDbEndpoint) });
	dynamoDbOrder = new AWS.DynamoDB({ accessKeyId: 'headly48', secretAccessKey: '123', region: 'us-west-2', endpoint: new AWS.Endpoint(process.env.dynamoDbEndpoint) });
} else {
	dynamoDb = new AWS.DynamoDB();
	dynamoDbWallet = new AWS.DynamoDB();
	dynamoDbOrder = new AWS.DynamoDB();
}

let creditCardService = new CreditCardService(dynamoDb, process.env.CREDITCARD_TABLE);
let walletService = new WalletService(dynamoDbWallet, process.env.WALLET_TABLE);
let orderService = new OrderService(dynamoDbOrder, process.env.ORDER_TABLE);

module.exports.listCreditCard = (event, context, callback) => {
	context.callbackWaitsForEmptyEventLoop = false;
	
	if (!event.cognitoPoolClaims || !event.cognitoPoolClaims.email) {
		console.log(JSON.stringify(event));
		return callback(JSON.stringify({ statusCode: "[400]", errorMessage: 'Não foi possível obter o e-mail ' }));		
	}
	
	let email = event.cognitoPoolClaims.email;
	
	walletService.getId(email)
	.then(id => {
		if (!id) {
			console.log(id);
			callback(JSON.stringify({ statusCode: "[404]", errorMessage: `Não existe wallet para ${email}`}));			
		}
		return creditCardService.list(id);
	}).then(data => {
		callback(null, data);
	}).catch(error => callback(JSON.stringify({ error: error })));
		
};

module.exports.createCreditCard = (event, context, callback) => {
	if (!event.cognitoPoolClaims || !event.cognitoPoolClaims.email) {
		console.log(JSON.stringify(event));
		return callback(JSON.stringify({ statusCode: "[400]", errorMessage: 'Não foi possível obter o e-mail '}));		
	}
	
	let email = event.cognitoPoolClaims.email;
	let requestBody = event.body;

	if (!requestBody.name || !requestBody.cardNumber || !requestBody.cvv || !requestBody.expiryDate || !requestBody.limit) {
		console.log(JSON.stringify(requestBody));
		return callback(JSON.stringify({ statusCode: "[400]", errorMessage: 'Todos os campos são obrigatórios' }));
	}
	
	walletService.getId(email)
	.then(id => {
		if (!id) {
			console.log(id);
			callback(JSON.stringify({ statusCode: "[404]", errorMessage: `Não existe wallet para ${email}`}));			
		}
		requestBody.walletId = id;

		return creditCardService.create(requestBody);
	}).then(data => {
		walletService.updateCreditLimit(requestBody.walletId, requestBody.limit).then(function(){
            callback(null, { statusCode: 201, body: "" });
        }); 
	}).catch(error => {
		console.log('[400] - Error creating credit card. ' + error);
		callback('[400] - Error creating credit card. ' + error);
	});
};

module.exports.deleteCreditCard = (event, context, callback) => {	

	if (!event.path || !uuidvalidator(event.path.id)) {
		console.log(JSON.stringify(event));
		return callback(JSON.stringify({ statusCode: "[400]", errorMessage: 'CreditCardId is invalid' }));
	}

	creditCardService.get(event.path.id).then(data => {		
		return walletService.removeLimitAvailableCredit(data.walletId, data.limit, data.availableCredit);
	}).then (data => {		
		return orderService.listByCreditCard(event.path.id);
	}).then(orders => {
		console.log(JSON.stringify(orders));		
		return orderService.deleteBatch(orders);		
	}).then(data => {
		console.log('orderService.deleteCreditCard');
		return creditCardService.delete(event.path.id);
	}).catch(function (error) {
		console.log('[400] - Error deleting credit card. ' + error);
		callback('[400] - Error deleting credit card. ' + error);
	});
};
