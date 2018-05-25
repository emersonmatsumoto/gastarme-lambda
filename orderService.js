'use strict';

const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');

class OrderService {
	constructor(dynamoDb, tableName) {
		this.dynamoDb = dynamoDb;
		this.tableName = tableName;
	}

	list(walletId) {
		const params = {
			TableName: this.tableName,
			//IndexName: 'WalletIndex',
			FilterExpression: 'walletId = :walletId',
			ExpressionAttributeValues: { ':walletId': { "S": walletId } }
		};

		return this.dynamoDb.scan(params).promise().then(function (data) {
			console.log(JSON.stringify(data));
			let orders = [];
			for (const key in data.Items) {
				let item = data.Items[key];
				let order = {};
				order.id = item.id.S;
				order.walletId = walletId;
				order.creditCardId = item.creditCardId.S;
				order.description = item.description.S;
				order.date = item.date.S;
				order.total = Number(item.total.N);

				orders.push(order);
			}

			return orders;
		});
	}

	listByCreditCard(creditCardId) {
		const params = {
			TableName: this.tableName,
			//IndexName: 'WalletIndex',
			FilterExpression: 'creditCardId = :creditCardId',
			ExpressionAttributeValues: { ':creditCardId': { "S": creditCardId } }
		};

		return this.dynamoDb.scan(params).promise().then(function (data) {
			let orders = [];
			for (const key in data.Items) {
				let item = data.Items[key];
				let order = {};
				order.id = item.id.S;
				order.walletId = item.walletId.S;
				order.creditCardId = creditCardId;
				order.description = item.description.S;
				order.date = item.date.S;
				order.total = Number(item.total.N);

				orders.push(order);
			}

			return orders;
		});
	}

	create(order) {
		let id = uuidv4();
		var params = {
			TableName: this.tableName,
			Item: {
				id: { S: id },
				walletId: { S: order.walletId },
				creditCardId: { S: order.creditCardId },
				description: { S: order.description },
				date: { S: order.date },
				total: { N: order.total.toString() }
			}
		};

		return this.dynamoDb.putItem(params).promise().then(function (data) {
			console.log('Created order ' + id);

			return { id: id };
		});
	}

	deleteBatch(orders) {		
		let items = [];
		for (let order of orders) {
			items.push({
				DeleteRequest : {
					Key: {
						id: order.id 
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

module.exports = OrderService;