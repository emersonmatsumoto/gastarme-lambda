'use strict';

const AWS = require('aws-sdk');
const WalletService = require('./walletService.js');
const CreditCardService = require('./creditCardService.js');
const OrderService = require('./orderService.js');
const uuidvalidator = require('uuid-validate');
const eventsToWatch = [
    'order.created'
];
let dynamoDb;
let dynamoDbCreditCard;
let dynamoDbOrder;

//Set dynamoDbEndpoint if it exists
if (process.env.dynamoDbEndpoint) {
	console.log('*** Manually setting dynamoDb config');
	dynamoDb = new AWS.DynamoDB({ accessKeyId: 'headly48', secretAccessKey: '123', region: 'us-west-2', endpoint: new AWS.Endpoint(process.env.dynamoDbEndpoint) });
	dynamoDbCreditCard = new AWS.DynamoDB({ accessKeyId: 'headly48', secretAccessKey: '123', region: 'us-west-2', endpoint: new AWS.Endpoint(process.env.dynamoDbEndpoint) });
	dynamoDbOrder = new AWS.DynamoDB({ accessKeyId: 'headly48', secretAccessKey: '123', region: 'us-west-2', endpoint: new AWS.Endpoint(process.env.dynamoDbEndpoint) });
} else {
	dynamoDb = new AWS.DynamoDB();
	dynamoDbCreditCard = new AWS.DynamoDB();
	dynamoDbOrder = new AWS.DynamoDB();
}

let walletService = new WalletService(dynamoDb, process.env.WALLET_TABLE);
let creditCardService = new CreditCardService(dynamoDbCreditCard, process.env.CREDITCARD_TABLE);
let orderService = new OrderService(dynamoDbOrder, process.env.ORDER_TABLE);


module.exports.createWallet = (event, context, callback) => {
	if (!event.cognitoPoolClaims || !event.cognitoPoolClaims.email) {
		console.log(JSON.stringify(event));
		return callback(JSON.stringify({ statusCode: "[400]", errorMessage: 'Não foi possível obter o e-mail ' }));		
	}
	var email = event.cognitoPoolClaims.email;
	
	walletService.getId(email).then(id => {
		if (id) {
			console.log(id);
			throw 'Usuário já possui uma carteira.';
		}
		return walletService.create(email);
	}).then(data => {		
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
		if (!event.cognitoPoolClaims.groups.includes('admin')) {
			console.log("Permissão negada");
			callback(JSON.stringify({ statusCode: "[403]", errorMessage: "Proibido" }));			
		}
		else {
			walletService.listAll().then(data => {		
				callback(null, data);
			}).catch(function (error) {
				console.log("getWallet all - " + JSON.stringify({ error: error }));
				callback(JSON.stringify({ error: error }));
			});
		}
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

module.exports.deleteWallet = (event, context, callback) => {	

	if (!event.path || !uuidvalidator(event.path.id)) {
		console.log(JSON.stringify(event));
		return callback(JSON.stringify({ statusCode: "[400]", errorMessage: 'WalletId inválido' }));
	}

	let walletId = event.path.id;
	let promises = [];

	promises.push(
		orderService.list(walletId).then(orders => {
			if (orders && orders.length > 0) {
				console.log("Removendo orders");
				return orderService.deleteBatch(orders);
			}
			return Promise.resolve(true);
	}));
	
	promises.push(
		creditCardService.list(walletId).then(creditCards => {
			if (creditCards && creditCards.length > 0) {
				console.log("Removendo credit cards");
				return creditCardService.deleteBatch(creditCards);
			}
			return Promise.resolve(true);
	}));

	console.log("Removendo wallets");
	promises.push(walletService.delete(walletId));
		
	Promise.all(promises).then(() => {
		callback(null, { statusCode: 201, body: "" });
	}).catch(function (error) {
		console.log('[400] - Error deleting credit card. ' + error);
		callback(JSON.stringify({ statusCode: "[400]", errorMessage: 'Erro ao excluir carteira - ' + error }));		
	});
};


