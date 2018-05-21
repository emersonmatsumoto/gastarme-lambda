'use strict';

const AWS = require('aws-sdk');
const PaymentService = require('./paymentService.js');
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

let paymentService = new PaymentService(dynamoDb, process.env.CREDITCARD_TABLE);

module.exports.getPayment = (event, context, callback) => {

	if (!event.pathParameters.id || !uuidvalidator(event.pathParameters.id)) {
		return callback(null, { statusCode: 400, body: JSON.stringify({ error: 'PaymentId is invalid' }) });
	}

	paymentService.getPayment(event.pathParameters.id).then(function (data) {
		if (!data || Object.keys(data).length === 0) {
			callback(null, { statusCode: 404, body: { message: 'Payment does not exist' } });
		} else {
			callback(null, { statusCode: 200, body: JSON.stringify(data) });
		}
	}).catch(function (error) {
		callback(JSON.stringify({ error: error }));
	});
};

module.exports.createPayment = (event, context, callback) => {
	let requestBody = JSON.parse(event.body);

	if (!requestBody.name) {
		return callback(null, { statusCode: 400, body: JSON.stringify({ error: 'Please provide user name' }) });
	}

	paymentService.createPayment(requestBody).then(function (payment) {
		callback(null, { statusCode: 201, body: JSON.stringify(payment) });
	}).catch(function (error) {
		console.log('Error creating credit card. ' + error);
		callback(error);
	});
};

module.exports.updatePayment = (event, context, callback) => {
	if (!event.pathParameters.id || !uuidvalidator(event.pathParameters.id)) {
		return callback(null, { statusCode: 400, body: JSON.stringify({ error: 'PaymentId is invalid' }) });
	}

	let requestBody = JSON.parse(event.body);

	if (!requestBody.userName) {
		return callback(null, { statusCode: 400, body: JSON.stringify({ error: 'Please provide users name' }) });
	}

	paymentService.updatePayment(event.pathParameters.id, requestBody).then(function () {
		callback(null, { statusCode: 204 });
	}).catch(function (error) {
		console.log('Error updating credit card. ' + error);
		callback(error);
	});
};

module.exports.deletePayment = (event, context, callback) => {
	let requestBody = JSON.parse(event.body);

	if (!event.pathParameters.id || !uuidvalidator(event.pathParameters.id)) {
		return callback(null, { statusCode: 400, body: JSON.stringify({ error: 'PaymentId is invalid' }) });
	}

	paymentService.deletePayment(event.pathParameters.id).then(function () {
		callback(null, { statusCode: 204 });
	}).catch(function (error) {
		console.log('Error deleting credit card. ' + error);
		callback(error);
	});
};
