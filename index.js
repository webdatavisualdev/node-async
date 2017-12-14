const express = require('express');
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
const request = require('request');
const btoa = require('btoa');
const serveStatic = require('serve-static');
const _ = require('lodash');

const API = 'https://app.close.io/api/v1/';
const token = '8c94e40011d3a9d79cef879e07863727061d830f9a26edaba03dcb62';
const headers = {'Authorization': 'Basic ' + btoa(token + ':""')};

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(serveStatic(__dirname, {'index': ['public/index.html']}));

var users = [
    {id: 'user_nj1EsYCg3dylxTldjAhlIPcndp4Dxhi7L381rLILzha', name: 'Mark Carter', fname: 'mark'},
    {id: 'user_7orOE41C1yTo0pCE3GPPM4sAyMbvC64QF0Flyx99VJw', name: 'Matt Calligan', fname: 'matt'},
    {id: 'user_Lm0fDWotK8ulu7Cpym8GoZUF5Jnt2R8oRHGUUphpMyj', name: 'Jonathan Woodruff', fname: 'jonathan'}
];

var metrics = {
    booked: {},
    performed: {}
};

app.get('/test', (req, res) => {
    res.send(metrics);
});

function getData() {
    var promises = [];

    users.map(function(user) {
        var url = API + 'report/activity/orga_VmrjYdiRSHUDQ1NnTxCnt1w8Cqa9olIQsExlq3vziO7';
        var query = {date_start: '12/1/2017', date_end: '12/31/2017', user_id: user.id};
        var promise = new Promise(function (resolve, reject) {
            var params = {url: url, qs: query, headers: headers};
            request.get(params, (err, response, body) => {
                resolve({body: JSON.parse(body), user: user, type: 'opportunity'});
            });
        });

        promises.push(promise);
        
        url = API + 'report/statuses/lead/orga_VmrjYdiRSHUDQ1NnTxCnt1w8Cqa9olIQsExlq3vziO7';
        query = {query: 'opportunity_user:' + user.name, date_end: '2018-01-01T04:59:59.999Z', date_start: '2017-12-01T05:00:00.000Z'};
        promise = new Promise(function (resolve, reject) {
            var params = {url: url, qs: query, headers: headers};
            request.get(params, (err, response, body) => {
                resolve({body: JSON.parse(body), user: user, type: 'presentation'});
            });
        });

        promises.push(promise);
    });

    Promise.all(promises).then(function (result) {
        result.forEach(function (data) {
            if (data.type === 'opportunity') {
                metrics.booked[data.user.fname] = {actual: data.body.opportunities_created};
            } else {
                var filtered = _.filter(data.body.status_overview, {'status_label':'Presented'});
                if (filtered.length > 0) {
                    metrics.performed[data.user.fname] = {actual: filtered[0].gained};
                }
            }
        });
    });
}

getData();
setInterval(getData, 300000);

const port = process.env.PORT || '3002';
app.set('port', port);

const server = http.createServer(app);
server.listen(port, () => console.log(`API running on localhost:${port}`));