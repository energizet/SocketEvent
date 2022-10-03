const WebSocket = require('ws');
const JSBI = require('jsbi');
const SocketClient = require('./SocketClient');
const Response = require("./Response");

class SocketEvent {
	options;
	WSServer;
	events = {};
	clients = {};
	idIterator = JSBI.BigInt(0);
	static instance;

	constructor(options) {
		this.options = options;
	}

	static getInstance(options) {
		if (SocketEvent.instance == null) {
			if (options == null) {
				throw "options must by initialised";
			}
			SocketEvent.instance = new SocketEvent(options);
		}
		return SocketEvent.instance;
	}

	on(event, callback) {
		this.events[event + '-request'] = async function () {
			try {
				return await callback(...arguments);
			} catch (ex) {
				let response = new Response();
				response.meta.status = 500;
				response.meta.message = ex.message;
				return response;
			}
		};
	}

	emit(event, data) {
		Object.keys(this.clients).forEach(key => {
			let client = this.clients[key];
			client.emit(event, data);
		});
	}

	run(callback) {
		this.WSServer = new WebSocket.Server(this.options);

		this.WSServer.on('connection', ws => {
			this.idIterator = JSBI.add(this.idIterator, JSBI.BigInt(1));
			let id = this.idIterator.toString();
			let client = new SocketClient(this, ws, id);
			this.clients[id] = client;
			//ws.send('connected');

			client.client.on('pong', function () {
				this.isAlive = true;
			});

			client.client.on('message', async json => {
				if (json === 'ping') {
					client.client.isAlive = true;
					client.client.send('pong');
					return;
				}

				let data = {};
				try {
					data = JSON.parse(json);
				} catch (ex) {
					console.log("-----Exception start-----\n", {
						id: client.id,
						auth: client.auth,
					}, "\n", json, "\n", ex, "\n-----Exception end-----");
				}
				let event = this.events[data.event];
				if (event != null) {
					let eventName = data.event.substring(0, data.event.length - 8);
					await this.eventIntercepter(eventName, data.id, client, data.data, event);
				}
			});

			client.client.on('close', () => {
				delete this.clients[id];
			});
		});
		if (callback != null) {
			callback();
		}
	}

	async eventIntercepter(eventName, id, client, data, event) {
		let response = await event(client, data);
		if (response == null) {
			response = new Response();
			response.meta.status = 500;
			response.meta.message = "event crashed";
		}
		client.emit(eventName, response, id);
	}
}

module.exports = SocketEvent;