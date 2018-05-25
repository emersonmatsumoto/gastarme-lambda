'use strict';

const uuidv4 = require('uuid/v4');
const moment = require('moment');
const AWS = require('aws-sdk');

class CreditCardService {
	constructor(dynamoDb, tableName) {
		this.dynamoDb = dynamoDb;
		this.tableName = tableName;
	}

	get(id) {
		var params = {
			TableName: this.tableName,
			Key: { // a map of attribute name to AttributeValue for all primary key attributes
				id: { S: id }
			}
		};
		return this.dynamoDb.getItem(params).promise().then(function (data) {			
			let item = data.Item;
			let creditCard = {};
			creditCard.id = id;
			creditCard.walletId = item.walletId.S;
			creditCard.name = item.name.S;
			creditCard.cardNumber = item.cardNumber.S;
			creditCard.expiryDate = item.expiryDate.S;
			creditCard.cvv = Number(item.cvv.N);
			creditCard.limit = Number(item.limit.N);	
			creditCard.availableCredit = Number(item.availableCredit.N);
			creditCard.payday = Number(item.payday.N);	
			creditCard.paydayDate = moment().startOf('day');
			
			creditCard.paydayDate.set('date', creditCard.payday);
			
			if (creditCard.paydayDate < moment()) {
				creditCard.paydayDate.add(1, 'month');
			} 

			return creditCard;
		});
	}

	list(walletId) {
		const params = {
			TableName: this.tableName,
			//IndexName: 'WalletIndex',
			FilterExpression: 'walletId = :walletId',
			ExpressionAttributeValues: {':walletId': {"S": walletId}}  
		};
		
		return this.dynamoDb.scan(params).promise().then(function (data) {
			console.log(JSON.stringify(data));
			let creditCards = [];
			for (const key in data.Items) {
				let item = data.Items[key];
				let creditCard = {};
				creditCard.id = item.id.S;
				creditCard.walletId = item.walletId.S;
				creditCard.name = item.name.S;
				creditCard.cardNumber = item.cardNumber.S;
				creditCard.expiryDate = item.expiryDate.S;
				creditCard.cvv = Number(item.cvv.N);
				creditCard.limit = Number(item.limit.N);	
				creditCard.availableCredit = Number(item.availableCredit.N);
				creditCard.payday = Number(item.payday.N);	
				creditCard.paydayDate = moment().startOf('day');
				
				creditCard.paydayDate.set('date', creditCard.payday);
				
				if (creditCard.paydayDate < moment()) {
					creditCard.paydayDate.add(1, 'month');
				} 

				creditCards.push(creditCard);
			}

			return creditCards;
		});
	}

	create(creditCard) {
		let id = uuidv4();

		var params = {
			TableName: this.tableName,
			Item: {
				id: { S: id },
				walletId: { S: creditCard.walletId },
				name: { S: creditCard.name },
				cardNumber: { S: creditCard.cardNumber },
				expiryDate: { S: creditCard.expiryDate },
				cvv: { N: creditCard.cvv.toString() },
				limit: { N: creditCard.limit.toString() },
				availableCredit: { N: creditCard.limit.toString() },
				payday: { N: creditCard.payday.toString() }
			}
		};

		return this.dynamoDb.putItem(params).promise().then(function (data) {
			console.log('Created credit card ' + id);

			return { id: id };
		});
	}

	updateAvailableCredit(id, orderTotal) {
		var params = {
			TableName: this.tableName,
			Key: { // a map of attribute name to AttributeValue for all primary key attributes
				id: { S: id }
			},
			UpdateExpression: 'SET #a = #a - :availableCredit',
			ExpressionAttributeNames: {
				'#a' : 'availableCredit'
			},
			ExpressionAttributeValues: {
				':availableCredit': { N: orderTotal.toString() }
			}			
		};
		
		return this.dynamoDb.updateItem(params).promise();
	}

	delete(id) {
		var params = {
			TableName: this.tableName,
			Key: {
				id: { S: id }
			}
		};

		return this.dynamoDb.deleteItem(params).promise();
	}

	deleteBatch(creditCards) {
		let items = [];
		for (let creditCard of creditCards) {
			items.push({
				DeleteRequest : {
					Key: {
						id: creditCard.id 
					}
				}				
			});
		}

		var params = {
			RequestItems : {
				[this.tableName] : items
			}
		};
		

		return new AWS.DynamoDB.DocumentClient().batchWrite(params).promise();
	}
}

module.exports = CreditCardService;