'use strict';

const uuidv4 = require('uuid/v4');
const moment = require('moment');

class CreditCardService {
	constructor(dynamoDb, tableName) {
		this.dynamoDb = dynamoDb;
		this.tableName = tableName;
	}

	listCreditCard(walletId) {
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
				creditCard.payday = Number(item.payday.N);	
				creditCard.paydayDate = moment().startOf('day');
				
				creditCard.paydayDate.set('date', creditCard.payday);
				
				if (creditCard.paydayDate < moment()) {
					creditCard.paydayDate.add(1, 'month');
				} 

				console.log('p:' + creditCard.payday + ',d:' + creditCard.paydayDate.toString());
				creditCards.push(creditCard);
			}

			return creditCards;
		});
	}

	createCreditCard(creditCard) {
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
				payday: { N: creditCard.payday.toString() }
			}
		};

		return this.dynamoDb.putItem(params).promise().then(function (data) {
			console.log('Created credit card ' + id);

			return { id: id };
		});
	}

	deleteCreditCard(id) {
		var params = {
			TableName: this.tableName,
			Key: {
				id: { S: id }
			}
		};

		return this.dynamoDb.deleteItem(params).promise();
	}
}

module.exports = CreditCardService;