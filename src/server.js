import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import Pusher from 'pusher';

import mongoData from './mongoData.js';

const port = process.env.PORT || 3000;


const pusher = new Pusher({
	appId: '1240061',
	key: 'a031d64b72930255bdbd',
	secret: '3f9a7dd9090d82659502',
	cluster: 'ap2',
	useTLS: true,
});

const app = express();

app.use(express.json());
app.use(cors());

const mongoURI =
	'mongodb+srv://admin:GKtUYTCWYAL2AzJB@cluster0.gn5rs.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';

mongoose.connect(mongoURI, {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

const db = mongoose.connection;
db.once('open', () => {
	console.log('DB connected');

	const msgCollection = db.collection('conversations');
	const changeStream = msgCollection.watch();

	changeStream.on('change', (change) => {
		console.log('change occured', change);

		if (change.operationType === 'insert') {
			pusher.trigger('channels', 'newChannel', {
				change: change,
			});
		} else if (change.operationType === 'update') {
			pusher.trigger('conversation', 'newMessage', {
				change: change,
			});
		} else {
			console.log('error triggering pusher');
		}
	});
});

app.get('/', (req, res) => {
	res.status(200).send('Hello Sumanta!');
});

app.post('/new/channel', (req, res) => {
	const dbData = req.body;

	mongoData.create(dbData, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(201).send(data);
		}
	});
});

app.get('/get/channelList', (req, res) => {
	mongoData.find((err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			let channels = [];
			data.map((channelData) => {
				const channelInfo = {
					id: channelData._id,
					name: channelData.channelName,
				};
				channels.push(channelInfo);
			});

			res.status(200).send(channels);
		}
	});
});

app.post('/new/message', (req, res) => {
	const newMessage = req.body;
	mongoData.update(
		{ _id: req.query.id },
		{ $push: { conversation: req.body } },
		(err, data) => {
			if (err) {
				res.status(500).send(err);
				console.log(err);
			} else {
				res.status(201).send(data);
			}
		},
	);
});

app.get('/get/data', (req, res) => {
	mongoData.find((err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(200).send(data);
		}
	});
});


app.get('/get/conversation', (req, res) => {
	const id = req.query.id;
	mongoData.find({ _id: id }, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(200).send(data);
		}
	});
});

app.listen(port, () => {
	console.log(`http://localhost:${port}`);
});
