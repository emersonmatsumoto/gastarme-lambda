'use strict';

const uuidv4 = require('uuid/v4');

class WalletService {
	constructor(dynamoDb, tableName) {
		this.dynamoDb = dynamoDb;
		this.tableName = tableName;
	}

	listAll() {
		const params = {
			TableName: this.tableName,
		};

		return this.dynamoDb.scan(params).promise().then(function (data) {
			console.log(JSON.stringify(data));
			let wallets = [];
			for (const key in data.Items) {
				let item = data.Items[key];
				let wallet = {};
				wallet.id = item.id.S;
				wallet.email = item.email.S;
				wallet.creditLimit = Number(item.creditLimit.N);
				wallet.availableCredit = Number(item.availableCredit.N);

				wallets.push(wallet);
			}

			return wallets;
		});
	}

	list(email) {
		const params = {
			TableName: this.tableName,
			FilterExpression: 'email = :email',
			ExpressionAttributeValues: {':email': {"S": email}}  
		};

		return this.dynamoDb.scan(params).promise().then(function (data) {
			console.log(JSON.stringify(data));
			let wallets = [];
			for (const key in data.Items) {
				let item = data.Items[key];
				let wallet = {};
				wallet.id = item.id.S;
				wallet.email = item.email.S;
				wallet.creditLimit = Number(item.creditLimit.N);
				wallet.availableCredit = Number(item.availableCredit.N);

				wallets.push(wallet);
			}

			return wallets;
		});
	}

	getId(email) {
		const params = {
			TableName: this.tableName,
			IndexName: 'EmailIndex',
			FilterExpression: 'email = :email',
			ExpressionAttributeValues: {':email': {"S": email}}  
		};

		return this.dynamoDb.scan(params).promise().then(function (data) {
			if (data.Count === 0) {
				return null;
			}

			return data.Items[0].id.S;
		});
	}

	get(id) {
		var params = {
			TableName: this.tableName,
			Key: { // a map of attribute name to AttributeValue for all primary key attributes
				id: { S: id }
			}
		};
		return this.dynamoDb.getItem(params).promise().then(function (data) {

			let wallet = {};
			wallet.id = data.Item.id.S;
			wallet.email = data.Item.email.S;
            wallet.creditLimit = Number(data.Item.creditLimit.N);
            wallet.availableCredit = Number(data.Item.availableCredit.N);

			return wallet;
		});
	}

	updateCreditLimit(id, limit) {
		var params = {
			TableName: this.tableName,
			Key: { // a map of attribute name to AttributeValue for all primary key attributes
				id: { S: id }
			},
			UpdateExpression: 'SET #c = #c + :creditLimit, #a = #a + :availableCredit',
			ExpressionAttributeNames: {
				'#c' : 'creditLimit',
				'#a' : 'availableCredit'
			},
			ExpressionAttributeValues: {
				':creditLimit': { N: limit.toString() },
				':availableCredit': { N: limit.toString() }
			}			
		};
		
		return this.dynamoDb.updateItem(params).promise();
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

	removeLimitAvailableCredit(id, limit, availableCredit) {
		var params = {
			TableName: this.tableName,
			Key: { // a map of attribute name to AttributeValue for all primary key attributes
				id: { S: id }
			},
			UpdateExpression: 'SET #c = #c - :creditLimit, #a = #a - :availableCredit',
			ExpressionAttributeNames: {
				'#c' : 'creditLimit',
				'#a' : 'availableCredit'
			},
			ExpressionAttributeValues: {
				':creditLimit': { N: limit.toString() },
				':availableCredit': { N: availableCredit.toString() }
			}			
		};
		
		return this.dynamoDb.updateItem(params).promise();
	}

	createWallet(email) {
		let id = uuidv4();

		var params = {
			TableName: this.tableName,
			Item: {
				id: { S: id },
				email: { S: email },
                creditLimit: { N: "0" },
                availableCredit: { N: "0" }
			}
		};


		return this.dynamoDb.putItem(params).promise().then(function (data) {
			console.log('Created wallet ' + id);

			return { 
				id: id,
				email: email,
                creditLimit: 0,
                availableCredit: 0
			};
		});
	}
}

module.exports = WalletService;