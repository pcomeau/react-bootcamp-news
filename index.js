const express = require('express');
const request = require('request');
const path = require('path');
const stories = require('./stories');

const app = express();

app.use((req, res, next) => {
    console.log('Request details: Methos:', req.method, 'Original URL:', req.originalUrl);
    next();
});

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:1234');
    next();
});

// serves up client front end on "/""
app.use(express.static(path.join(__dirname, 'client/dist')));

app.get('/ping', (req, res) => {
    res.send('pong');
});

app.get('/stories', (req, res) => {
    res.json(stories);
});

app.get('/stories/:title', (req, res) => {
    const { title } = req.params;
    res.json(stories.filter(story => story.title.includes(title)));
});

app.get('/topStories', (req, res, next) => {
    request(
        { url: 'https://hacker-news.firebaseio.com/v0/topstories.json'} ,
        (error, response, body) => {

            if(error || response.statusCode != 200) {
                return next(new Error('Error requesting top stories'));
            }

            const topStories = JSON.parse(body);
            const limit = 10;
            const fullTopStories = [];

            Promise.all(
                topStories.slice(0, limit).map(story => {
                    return new Promise((resolve, reject) => {
                        request(
                            {url: `https://hacker-news.firebaseio.com/v0/item/${story}.json`},
                            (error, response, body) => {
                                if(error || response.statusCode !== 200) {
                                    return reject(new Error('Error requesting story item'));
                                }
                                resolve(JSON.parse(body));
                            }
                        );
                    })
                })
            )
            .then(fullTopStories => {
                res.json(fullTopStories);
            })
            .catch(error => next(error));
        }
    )
});

app.use((err, req, res, next) => {
    res.status(500).json({ type: 'error', message: err.message });
});

// first look for env variable
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('listening on', PORT)
});