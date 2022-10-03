class SocketClient {
	id;
	client;
	authed = false;
	auth = {id: '', token: ''};

	broadcast = () => {
	};

	constructor(se, client, id) {
		this.id = id;
		this.client = client;
		this.broadcast.emit = (event, data, condition = _ => true) => {
			this.broadcastEmit(se, event, data, condition);
		}
	}

	setAuth(value, id, token) {
		this.authed = value;
		this.auth = {id: id, token: token};
	}

	isAuth() {
		return this.authed;
	}

	getAuth() {
		return this.auth;
	}

	broadcastEmit(se, event, data, condition) {
		Object.keys(se.clients).forEach(key => {
			let client = se.clients[key];
			if (this.client !== client.client && condition(client)) {
				client.emit(event, data);
			}
		});
	}

	emit(event, data, id = null) {
		this.client.send(JSON.stringify({event: event + '-response', id: id, data: data}));
	}
}

module.exports = SocketClient;