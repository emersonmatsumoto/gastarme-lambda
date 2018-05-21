'use strict';

const uuidv4 = require('uuid/v4');

class PaymentService {
	constructor(dynamoDb, tableName) {
		this.dynamoDb = dynamoDb;
		this.tableName = tableName;
	}

	getPayment(id) {
		var params = {
			TableName: this.tableName,
			Key: { // a map of attribute name to AttributeValue for all primary key attributes
				id: { S: id }
			}
		};
		return this.dynamoDb.getItem(params).promise().then(function (data) {
			let payment = {};
			payment.id = data.Item.id.S;
			payment.name = data.Item.name.S;
			payment.cardNumber = data.Item.cardNumber.S;
            payment.expiryDate = data.Item.expiryDate.S;
            payment.cvv = data.Item.cvv.N;
            payment.limit = data.Item.limit.N;

			return payment;
		});
	}

	updatePayment(id, payment) {
		var params = {
			TableName: this.tableName,
			Key: { // a map of attribute name to AttributeValue for all primary key attributes
				id: { S: id }
			},
			AttributeUpdates: {}
		};

		if (user.name) {
			params.AttributeUpdates.name = {
				Action: 'PUT',
				Value: { S: wallet.name }
			}
		}

		return this.dynamoDb.updateItem(params).promise();
	}

	createPayment(payment) {
		let id = uuidv4();

		var params = {
			TableName: this.tableName,
			Item: {
				id: { S: id },
				walletId: { S: payment.walletId },
				name: { S: payment.name },
				cardNumber: { S: payment.cardNumber },
				expiryDate: { S: payment.expiryDate },
				cvv: { N: payment.cvv.toString() },
				limit: { N: payment.limit.toString() }
			}
		};

		return this.dynamoDb.putItem(params).promise().then(function (data) {
			console.log('Created credit card ' + id);

			return { id: id };
		});
	}

	deletePayment(id) {
		var params = {
			TableName: this.tableName,
			Key: {
				id: { S: id }
			}
		};

		return this.dynamoDb.deleteItem(params).promise();
	}
}

module.exports = PaymentService;