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
	
	console.log(JSON.stringify(event));

	let email = event.cognitoPoolClaims.email;
	let order = event.body;

	if (!order.description || !order.total) {
		console.log(JSON.stringify(order));
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
		if(!wallet || wallet.availableCredit < order.total) {
			return callback(null, { statusCode: 400, body: { message: `Limite menor que o valor da compra`}});									
		}

		return creditCardService.listCreditCard(wallet.id);
	}).then(creditCards => {
		return processOrder(creditCards, order);
	}).then(data => {		
		callback(null, { statusCode: 201, body: "" });
	}).catch(error => {
		console.log('Error creating order. ' + error);
		callback(JSON.stringify({ error: error }));
	});
};

function processOrder(creditCards, order){
	let total = order.total;
	let promises = [];

	console.log(JSON.stringify(creditCards));	
	creditCards.sort(sortCreditCard);
	console.log(JSON.stringify(creditCards));
	
	for (let creditCard of creditCards) {
		if (total === 0) {
			break;
		}
		if (total > creditCard.availableCredit) {
			order.total = creditCard.availableCredit;
			total -= creditCard.availableCredit;
		} else {
			order.total = total;
			total = 0;
		}
		order.walletId = creditCard.walletId;
		order.creditCardId = creditCard.id;
		order.date = new Date().toISOString();
		promises.push(orderService.create(order));
		promises.push(creditCardService.updateAvailableCredit(creditCard.id, order.total));
		promises.push(walletService.updateAvailableCredit(creditCard.walletId, order.total));
	}

	return Promise.all(promises);
}

function sortCreditCard(a, b) {
	if (a.paydayDate > b.paydayDate) {            
		return -1
	} else if (b.paydayDate > a.paydayDate) {     
		return 1
	} else {               
		return a.availableCredit - b.availableCredit
	}
}
